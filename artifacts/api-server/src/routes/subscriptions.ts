import { Router, type IRouter } from "express";
import { db, subscriptionPlansTable, businessSubscriptionsTable, businessesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireRole";
import { enforceSingleDefaultPlan } from "../lib/subscription-plans";

const router: IRouter = Router();

const planInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0),
  setupFee: z.number().min(0).optional(),
  transactionFeePercent: z.number().min(0).max(100).optional(),
  trialDays: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
});

const subscriptionInputSchema = z.object({
  planId: z.number().int(),
  status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "PAUSED"]),
  trialEndsAt: z.string().optional(),
});

function serializePlan(p: typeof subscriptionPlansTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    monthlyPrice: parseFloat(p.monthlyPrice),
    setupFee: p.setupFee ? parseFloat(p.setupFee) : null,
    transactionFeePercent: p.transactionFeePercent ? parseFloat(p.transactionFeePercent) : null,
    trialDays: p.trialDays,
    isActive: p.isActive,
    isDefault: p.isDefault,
    createdAt: p.createdAt,
  };
}

function serializeSubscription(
  s: typeof businessSubscriptionsTable.$inferSelect,
  plan?: typeof subscriptionPlansTable.$inferSelect,
) {
  return {
    id: s.id,
    businessId: s.businessId,
    planId: s.planId,
    status: s.status,
    trialEndsAt: s.trialEndsAt,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    stripeSubscriptionId: s.stripeSubscriptionId,
    plan: plan ? serializePlan(plan) : undefined,
    createdAt: s.createdAt,
  };
}

const adminRouter: IRouter = Router();
adminRouter.use(requireAdmin);

// GET /api/admin/subscription-plans
adminRouter.get("/subscription-plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(subscriptionPlansTable).orderBy(subscriptionPlansTable.monthlyPrice);
  res.json(plans.map(serializePlan));
});

// POST /api/admin/subscription-plans
adminRouter.post("/subscription-plans", async (req, res): Promise<void> => {
  const parsed = planInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const [plan] = await db.insert(subscriptionPlansTable).values({
    name: d.name,
    description: d.description,
    monthlyPrice: String(d.monthlyPrice),
    setupFee: d.setupFee != null ? String(d.setupFee) : null,
    transactionFeePercent: d.transactionFeePercent != null ? String(d.transactionFeePercent) : null,
    trialDays: d.trialDays,
    isActive: d.isActive,
    isDefault: d.isDefault,
  }).returning();

  if (plan.isDefault) {
    await enforceSingleDefaultPlan(plan.id);
  }

  res.status(201).json(serializePlan(plan));
});

// PUT /api/admin/subscription-plans/:id
adminRouter.put("/subscription-plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = planInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d2 = parsed.data;
  const updateSet: Record<string, unknown> = {};
  if (d2.name !== undefined) updateSet.name = d2.name;
  if (d2.description !== undefined) updateSet.description = d2.description;
  if (d2.monthlyPrice !== undefined) updateSet.monthlyPrice = String(d2.monthlyPrice);
  if (d2.setupFee !== undefined) updateSet.setupFee = d2.setupFee != null ? String(d2.setupFee) : null;
  if (d2.transactionFeePercent !== undefined) updateSet.transactionFeePercent = d2.transactionFeePercent != null ? String(d2.transactionFeePercent) : null;
  if (d2.trialDays !== undefined) updateSet.trialDays = d2.trialDays;
  if (d2.isActive !== undefined) updateSet.isActive = d2.isActive;
  if (d2.isDefault !== undefined) updateSet.isDefault = d2.isDefault;

  const [updated] = await db.update(subscriptionPlansTable).set(updateSet as never).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }

  if (updated.isDefault) {
    await enforceSingleDefaultPlan(updated.id);
    const [refreshed] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
    res.json(serializePlan(refreshed ?? updated));
    return;
  }

  res.json(serializePlan(updated));
});

// DELETE /api/admin/subscription-plans/:id
adminRouter.delete("/subscription-plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  res.status(204).send();
});

// GET /api/admin/businesses/:id/subscription
adminRouter.get("/businesses/:id/subscription", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.id, 10);
  const [sub] = await db.select().from(businessSubscriptionsTable).where(eq(businessSubscriptionsTable.businessId, businessId));
  if (!sub) { res.status(404).json({ error: "No subscription" }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));
  res.json(serializeSubscription(sub, plan));
});

// PUT /api/admin/businesses/:id/subscription
adminRouter.put("/businesses/:id/subscription", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.id, 10);
  const parsed = subscriptionInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, parsed.data.planId));
  if (!plan) {
    res.status(404).json({ error: "Plan not found" });
    return;
  }

  const existing = await db.select().from(businessSubscriptionsTable).where(eq(businessSubscriptionsTable.businessId, businessId));

  let sub;
  if (existing.length > 0) {
    const values: Record<string, unknown> = { planId: parsed.data.planId, status: parsed.data.status };
    if (parsed.data.trialEndsAt) values.trialEndsAt = new Date(parsed.data.trialEndsAt);
    [sub] = await db.update(businessSubscriptionsTable).set(values).where(eq(businessSubscriptionsTable.businessId, businessId)).returning();
  } else {
    const values: Record<string, unknown> = { businessId, planId: parsed.data.planId, status: parsed.data.status };
    if (parsed.data.trialEndsAt) values.trialEndsAt = new Date(parsed.data.trialEndsAt);
    [sub] = await db.insert(businessSubscriptionsTable).values(values as never).returning();
  }

  res.json(serializeSubscription(sub, plan));
});

router.use("/admin", adminRouter);

// GET /api/businesses/:id/subscription — caller must own the business or be an admin
router.get("/businesses/:businessId/subscription", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const businessId = parseInt(req.params.businessId, 10);

  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  if (user.role !== "ADMIN") {
    const [biz] = await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!biz || biz.ownerId !== userId) {
      res.status(403).json({ error: "Forbidden: you do not own this business" });
      return;
    }
  }

  const [sub] = await db.select().from(businessSubscriptionsTable).where(eq(businessSubscriptionsTable.businessId, businessId));
  if (!sub) { res.status(404).json({ error: "No subscription" }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));
  res.json(serializeSubscription(sub, plan));
});

export default router;
