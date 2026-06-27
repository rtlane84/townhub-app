import { Router, type IRouter } from "express";
import { db, appointmentRequestsTable, businessesTable, productsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import {
  CreateAppointmentRequestBody,
  ListBusinessAppointmentRequestsParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireRole";
import { isSalonBusiness } from "@workspace/api-zod";
import { notifyOwnerNewAppointmentRequest } from "../lib/notifications";

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
    createdAt: row.createdAt,
  };
}

// POST /api/appointment-requests
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

  if (!isSalonBusiness(business.type)) {
    res.status(400).json({ error: "This business does not accept appointment requests." });
    return;
  }

  let serviceName = d.serviceName?.trim() || null;
  if (d.productId) {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, d.productId), eq(productsTable.businessId, d.businessId)));
    if (!product) {
      res.status(400).json({ error: "Service not found" });
      return;
    }
    serviceName = product.name;
  }

  const [request] = await db
    .insert(appointmentRequestsTable)
    .values({
      businessId: d.businessId,
      customerName: d.customerName.trim(),
      customerEmail: d.customerEmail?.trim() || null,
      customerPhone: d.customerPhone?.trim() || null,
      serviceName,
      productId: d.productId ?? null,
      requestedDate: d.requestedDate,
      requestedTime: d.requestedTime.trim(),
      notes: d.notes?.trim() || null,
    })
    .returning();

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

  const rows = await db
    .select()
    .from(appointmentRequestsTable)
    .where(eq(appointmentRequestsTable.businessId, params.data.businessId))
    .orderBy(desc(appointmentRequestsTable.createdAt));

  res.json(rows.map(serializeAppointmentRequest));
});

export default router;
