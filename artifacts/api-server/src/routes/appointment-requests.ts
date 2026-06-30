import { Router, type IRouter } from "express";
import { db, appointmentRequestsTable, businessesTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateAppointmentRequestBody,
  ListBusinessAppointmentRequestsParams,
  CreateBusinessAppointmentRequestParams,
  CreateBusinessAppointmentRequestBody,
  UpdateBusinessAppointmentRequestStatusParams,
  UpdateBusinessAppointmentRequestStatusBody,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireRole";
import { acceptsAppointmentRequests } from "@workspace/api-zod";
import {
  canTransitionAppointmentStatus,
  isAppointmentRequestStatus,
} from "@workspace/api-zod";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  notifyCustomerAppointmentStatusUpdate,
  notifyOwnerNewAppointmentRequest,
} from "../lib/notifications";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function serializeAppointmentRequest(row: typeof appointmentRequestsTable.$inferSelect) {
  return {
    id: row.id,
    businessId: row.businessId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    serviceName: row.serviceName,
    productId: row.productId,
    requestedDate: row.requestedDate,
    requestedTime: row.requestedTime,
    notes: row.notes,
    status: row.status,
    source: row.source,
    statusNote: row.statusNote,
    createdAt: row.createdAt,
  };
}

async function resolveServiceName(
  businessId: number,
  productIdInput: number | undefined | null,
  serviceNameInput: string | undefined | null,
): Promise<{ serviceName: string | null; productId: number | null; error?: string }> {
  let serviceName = serviceNameInput?.trim() || null;
  let productId: number | null = productIdInput ?? null;

  if (productId) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, productId), eq(productsTable.businessId, businessId)));
    if (!product) {
      return { serviceName: null, productId: null, error: "Service not found" };
    }
    serviceName = product.name;
  }

  return { serviceName, productId };
}

async function insertAppointmentRequest(values: {
  businessId: number;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceName?: string | null;
  productId?: number | null;
  requestedDate: string;
  requestedTime: string;
  notes?: string | null;
  source: "CUSTOMER" | "MANUAL";
  status?: string;
}) {
  const [request] = await db
    .insert(appointmentRequestsTable)
    .values({
      businessId: values.businessId,
      customerName: values.customerName.trim(),
      customerEmail: values.customerEmail?.trim() || null,
      customerPhone: values.customerPhone?.trim() || null,
      serviceName: values.serviceName ?? null,
      productId: values.productId ?? null,
      requestedDate: values.requestedDate,
      requestedTime: values.requestedTime.trim(),
      notes: values.notes?.trim() || null,
      source: values.source,
      status: values.status ?? "NEW",
    })
    .returning();

  return request!;
}

// POST /api/appointment-requests — public customer request
router.post("/appointment-requests", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, d.businessId));

  if (!business || !business.active) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  if (!acceptsAppointmentRequests(business)) {
    res.status(400).json({ error: "This business does not accept appointment requests." });
    return;
  }

  const resolved = await resolveServiceName(d.businessId, d.productId, d.serviceName);
  if (resolved.error) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  const request = await insertAppointmentRequest({
    businessId: d.businessId,
    customerName: d.customerName,
    customerEmail: d.customerEmail,
    customerPhone: d.customerPhone,
    serviceName: resolved.serviceName,
    productId: resolved.productId,
    requestedDate: d.requestedDate,
    requestedTime: d.requestedTime,
    notes: d.notes,
    source: "CUSTOMER",
  });

  res.status(201).json(serializeAppointmentRequest(request));

  notifyOwnerNewAppointmentRequest({
    business,
    appointmentRequestId: request.id,
    customerName: request.customerName,
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
    serviceName: request.serviceName,
    requestedDate: request.requestedDate,
    requestedTime: request.requestedTime,
    notes: request.notes,
  }).catch(() => {});
});

// GET /api/businesses/:businessId/appointment-requests
router.get("/businesses/:businessId/appointment-requests", requireAuth, async (req, res): Promise<void> => {
  const params = ListBusinessAppointmentRequestsParams.safeParse({
    businessId: parseId(req.params.businessId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await authorizeBusinessOwnerOrAdmin(req, params.data.businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const rows = await db
    .select()
    .from(appointmentRequestsTable)
    .where(eq(appointmentRequestsTable.businessId, params.data.businessId))
    .orderBy(desc(appointmentRequestsTable.createdAt));

  res.json(rows.map(serializeAppointmentRequest));
});

// POST /api/businesses/:businessId/appointment-requests — owner manual entry
router.post("/businesses/:businessId/appointment-requests", requireAuth, async (req, res): Promise<void> => {
  const params = CreateBusinessAppointmentRequestParams.safeParse({
    businessId: parseId(req.params.businessId),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = CreateBusinessAppointmentRequestBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const access = await authorizeBusinessOwnerOrAdmin(req, params.data.businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  if (!acceptsAppointmentRequests(access.business)) {
    res.status(400).json({ error: "This business is not in appointment mode." });
    return;
  }

  const d = body.data;
  const resolved = await resolveServiceName(params.data.businessId, d.productId, d.serviceName);
  if (resolved.error) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  const request = await insertAppointmentRequest({
    businessId: params.data.businessId,
    customerName: d.customerName,
    customerEmail: d.customerEmail,
    customerPhone: d.customerPhone,
    serviceName: resolved.serviceName,
    productId: resolved.productId,
    requestedDate: d.requestedDate,
    requestedTime: d.requestedTime,
    notes: d.notes,
    source: "MANUAL",
    status: "CONFIRMED",
  });

  res.status(201).json(serializeAppointmentRequest(request));
});

// PATCH /api/businesses/:businessId/appointment-requests/:id
router.patch(
  "/businesses/:businessId/appointment-requests/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateBusinessAppointmentRequestStatusParams.safeParse({
      businessId: parseId(req.params.businessId),
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const body = UpdateBusinessAppointmentRequestStatusBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: body.error.message });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, params.data.businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const [existing] = await db
      .select()
      .from(appointmentRequestsTable)
      .where(
        and(
          eq(appointmentRequestsTable.id, params.data.id),
          eq(appointmentRequestsTable.businessId, params.data.businessId),
        ),
      );

    if (!existing) {
      res.status(404).json({ error: "Appointment request not found" });
      return;
    }

    const nextStatus = body.data.status;
    if (!isAppointmentRequestStatus(nextStatus)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }

    if (!canTransitionAppointmentStatus(existing.status, nextStatus)) {
      res.status(409).json({
        error: `Cannot change status from ${existing.status} to ${nextStatus}`,
      });
      return;
    }

    const [updated] = await db
      .update(appointmentRequestsTable)
      .set({
        status: nextStatus,
        statusNote: body.data.statusNote?.trim() || null,
      })
      .where(eq(appointmentRequestsTable.id, existing.id))
      .returning();

    res.json(serializeAppointmentRequest(updated!));

    if (nextStatus === "CONFIRMED" || nextStatus === "DECLINED") {
      notifyCustomerAppointmentStatusUpdate({
        business: access.business,
        appointmentRequestId: updated!.id,
        customerName: updated!.customerName,
        customerEmail: updated!.customerEmail,
        customerPhone: updated!.customerPhone,
        serviceName: updated!.serviceName,
        requestedDate: updated!.requestedDate,
        requestedTime: updated!.requestedTime,
        status: nextStatus,
        statusNote: updated!.statusNote,
      }).catch(() => {});
    }
  },
);

export default router;
