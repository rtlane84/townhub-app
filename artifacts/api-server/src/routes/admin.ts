import { Router, type IRouter } from "express";
import { db, usersTable, businessesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import {
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  AssignBusinessOwnerParams,
  AssignBusinessOwnerBody,
  GetAdminSystemHealthResponse,
} from "@workspace/api-zod";
import { serializeBusiness } from "./businesses";
import { buildSystemHealthReport, buildFallbackHealthReport } from "../lib/system-health";
import { logOperationalFailure } from "../lib/operational-log";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// GET /api/admin/system/health
router.get("/admin/system/health", async (req, res): Promise<void> => {
  try {
    const report = await buildSystemHealthReport();
    const parsed = GetAdminSystemHealthResponse.safeParse(report);
    const data = parsed.success ? parsed.data : report;

    if (data.status === "error") {
      logOperationalFailure("health_check_unhealthy", {
        overallStatus: data.status,
        unavailableServices: data.services
          .filter((s) => s.status === "unavailable")
          .map((s) => s.name),
      });
    }

    res.status(200).json(data);
  } catch (err) {
    logOperationalFailure("health_check_failed", { scope: "admin_system_health" });
    req.log.error({ err }, "Admin system health check failed");
    const fallback = buildFallbackHealthReport(
      err instanceof Error ? err.message : "Health report could not be fully assembled",
    );
    res.status(200).json(fallback);
  }
});

// GET /api/admin/users
router.get("/admin/users", async (req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  const businesses = await db.select().from(businessesTable);
  const bizIdsByOwner = new Map<string, number[]>();
  for (const business of businesses) {
    if (!business.ownerId) continue;
    const existing = bizIdsByOwner.get(business.ownerId) ?? [];
    existing.push(business.id);
    bizIdsByOwner.set(business.ownerId, existing);
  }

  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      businessId: bizIdsByOwner.get(u.id)?.[0] ?? null,
      businessIds: bizIdsByOwner.get(u.id) ?? [],
      createdAt: u.createdAt,
    })),
  );
});

// PATCH /api/admin/users/:id/role
router.patch("/admin/users/:id/role", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateUserRoleParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserRoleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (existing.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(usersTable)
      .where(eq(usersTable.role, "ADMIN"));
    if (Number(adminCount) <= 1) {
      res.status(400).json({ error: "Cannot demote the last platform admin." });
      return;
    }
  }

  const [user] = await db
    .update(usersTable)
    .set({ role: parsed.data.role as never })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, user.id));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: business?.id ?? null,
    createdAt: user.createdAt,
  });
});

// PATCH /api/admin/businesses/:id/assign-owner
router.patch(
  "/admin/businesses/:id/assign-owner",
  async (req, res): Promise<void> => {
    const params = AssignBusinessOwnerParams.safeParse({
      id: parseId(req.params.id),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AssignBusinessOwnerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [owner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, parsed.data.ownerId));

    if (!owner) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [business] = await db
      .update(businessesTable)
      .set({ ownerId: parsed.data.ownerId })
      .where(eq(businessesTable.id, params.data.id))
      .returning();

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    // Also elevate user to BUSINESS_OWNER
    await db
      .update(usersTable)
      .set({ role: "BUSINESS_OWNER" })
      .where(eq(usersTable.id, parsed.data.ownerId));

    res.json(serializeBusiness(business));
  },
);

export default router;
