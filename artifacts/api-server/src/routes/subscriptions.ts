import { Router, type IRouter } from "express";
import {
  db,
  subscriptionPlansTable,
  subscriptionFeaturesTable,
  businessSubscriptionsTable,
  businessesTable,
  usersTable,
} from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireRole";
import {
  enforceSingleDefaultPlan,
  enforceSingleRecommendedPlan,
} from "../lib/subscription-plans";
import {
  createCustomerPortalSession,
  createSubscriptionCheckoutSession,
  changeBusinessSubscriptionPlan,
  refreshBusinessSubscriptionFromStripe,
} from "../lib/stripe-billing";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  getPlanFeatures,
  setPlanFeatures,
  getBusinessFeatureKeys,
  ensureDefaultSubscriptionFeatures,
  buildBusinessFeatureAccessReport,
} from "../lib/business-features";
import {
  serializePlan,
  serializePublicPricingPlan,
  serializeSubscription,
  serializeSubscriptionFeature,
} from "../lib/subscription-serializers";

const router: IRouter = Router();

const planInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  monthlyPrice: z.number().min(0),
  yearlyPrice: z.number().min(0).optional(),
  setupFee: z.number().min(0).optional(),
  transactionFeePercent: z.number().min(0).max(100).optional(),
  trialDays: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
  isDefault: z.boolean().optional().default(false),
  isPublic: z.boolean().optional().default(true),
  isRecommended: z.boolean().optional().default(false),
  isBeta: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
  stripeProductId: z.string().optional(),
  stripeMonthlyPriceId: z.string().optional(),
  stripeYearlyPriceId: z.string().optional(),
});

const subscriptionInputSchema = z.object({
  planId: z.number().int(),
  status: z.enum(["BETA", "TRIAL", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "SUSPENDED", "PAUSED", "INCOMPLETE"]),
  trialEndsAt: z.string().optional(),
  renewalAt: z.string().optional(),
  notes: z.string().optional(),
  billingInterval: z.enum(["monthly", "yearly"]).optional(),
});

const subscriptionCheckoutSchema = z.object({
  planId: z.number().int(),
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});

const subscriptionSyncSchema = z.object({
  mock: z.boolean().optional(),
  planId: z.number().int().optional(),
  interval: z.enum(["monthly", "yearly"]).optional(),
});

const featureInputSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const planFeaturesInputSchema = z.object({
  featureIds: z.array(z.number().int()),
});

function buildPlanUpdateSet(data: Partial<z.infer<typeof planInputSchema>>) {
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.description !== undefined) updateSet.description = data.description;
  if (data.monthlyPrice !== undefined) updateSet.monthlyPrice = String(data.monthlyPrice);
  if (data.yearlyPrice !== undefined) updateSet.yearlyPrice = data.yearlyPrice != null ? String(data.yearlyPrice) : null;
  if (data.setupFee !== undefined) updateSet.setupFee = data.setupFee != null ? String(data.setupFee) : null;
  if (data.transactionFeePercent !== undefined) {
    updateSet.transactionFeePercent = data.transactionFeePercent != null ? String(data.transactionFeePercent) : null;
  }
  if (data.trialDays !== undefined) updateSet.trialDays = data.trialDays;
  if (data.isActive !== undefined) updateSet.isActive = data.isActive;
  if (data.isDefault !== undefined) updateSet.isDefault = data.isDefault;
  if (data.isPublic !== undefined) updateSet.isPublic = data.isPublic;
  if (data.isRecommended !== undefined) updateSet.isRecommended = data.isRecommended;
  if (data.isBeta !== undefined) updateSet.isBeta = data.isBeta;
  if (data.sortOrder !== undefined) updateSet.sortOrder = data.sortOrder;
  if (data.stripeProductId !== undefined) updateSet.stripeProductId = data.stripeProductId || null;
  if (data.stripeMonthlyPriceId !== undefined) updateSet.stripeMonthlyPriceId = data.stripeMonthlyPriceId || null;
  if (data.stripeYearlyPriceId !== undefined) updateSet.stripeYearlyPriceId = data.stripeYearlyPriceId || null;

  return updateSet;
}

async function serializePlanWithFeatures(planId: number) {
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, planId));
  if (!plan) return null;
  const features = await getPlanFeatures(planId);
  return { ...serializePlan(plan), features };
}

const adminRouter: IRouter = Router();
adminRouter.use(requireAdmin);

// GET /api/admin/subscription-plans
adminRouter.get("/subscription-plans", async (_req, res): Promise<void> => {
  await ensureDefaultSubscriptionFeatures();
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.monthlyPrice));

  const payload = await Promise.all(
    plans.map(async (plan) => {
      const features = await getPlanFeatures(plan.id);
      return { ...serializePlan(plan), features };
    }),
  );

  res.json(payload);
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
    yearlyPrice: d.yearlyPrice != null ? String(d.yearlyPrice) : null,
    setupFee: d.setupFee != null ? String(d.setupFee) : null,
    transactionFeePercent: d.transactionFeePercent != null ? String(d.transactionFeePercent) : null,
    trialDays: d.trialDays,
    isActive: d.isActive,
    isDefault: d.isDefault,
    isPublic: d.isPublic,
    isRecommended: d.isRecommended,
    isBeta: d.isBeta,
    sortOrder: d.sortOrder,
    stripeProductId: d.stripeProductId,
    stripeMonthlyPriceId: d.stripeMonthlyPriceId,
    stripeYearlyPriceId: d.stripeYearlyPriceId,
  }).returning();

  if (plan.isDefault) await enforceSingleDefaultPlan(plan.id);
  if (plan.isRecommended) await enforceSingleRecommendedPlan(plan.id);

  res.status(201).json(await serializePlanWithFeatures(plan.id));
});

// PUT /api/admin/subscription-plans/:id
adminRouter.put("/subscription-plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = planInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updateSet = buildPlanUpdateSet(parsed.data);
  const [updated] = await db.update(subscriptionPlansTable).set(updateSet as never).where(eq(subscriptionPlansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }

  if (updated.isDefault) await enforceSingleDefaultPlan(updated.id);
  if (updated.isRecommended) await enforceSingleRecommendedPlan(updated.id);

  res.json(await serializePlanWithFeatures(updated.id));
});

// DELETE /api/admin/subscription-plans/:id
adminRouter.delete("/subscription-plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  res.status(204).send();
});

// GET /api/admin/subscription-plans/:id/features
adminRouter.get("/subscription-plans/:id/features", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(await getPlanFeatures(id));
});

// PUT /api/admin/subscription-plans/:id/features
adminRouter.put("/subscription-plans/:id/features", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = planFeaturesInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    await setPlanFeatures(id, parsed.data.featureIds);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update plan features";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
    return;
  }

  res.json(await getPlanFeatures(id));
});

// GET /api/admin/subscription-features
adminRouter.get("/subscription-features", async (_req, res): Promise<void> => {
  await ensureDefaultSubscriptionFeatures();
  const rows = await db
    .select()
    .from(subscriptionFeaturesTable)
    .orderBy(asc(subscriptionFeaturesTable.sortOrder), asc(subscriptionFeaturesTable.name));
  res.json(rows.map(serializeSubscriptionFeature));
});

// POST /api/admin/subscription-features
adminRouter.post("/subscription-features", async (req, res): Promise<void> => {
  const parsed = featureInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const [feature] = await db.insert(subscriptionFeaturesTable).values({
    key: d.key,
    name: d.name,
    description: d.description,
    category: d.category,
    sortOrder: d.sortOrder,
    isActive: d.isActive,
  }).returning();

  res.status(201).json(serializeSubscriptionFeature(feature));
});

// PUT /api/admin/subscription-features/:id
adminRouter.put("/subscription-features/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = featureInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const d = parsed.data;
  const updateSet: Record<string, unknown> = {};
  if (d.key !== undefined) updateSet.key = d.key;
  if (d.name !== undefined) updateSet.name = d.name;
  if (d.description !== undefined) updateSet.description = d.description;
  if (d.category !== undefined) updateSet.category = d.category;
  if (d.sortOrder !== undefined) updateSet.sortOrder = d.sortOrder;
  if (d.isActive !== undefined) updateSet.isActive = d.isActive;

  const [updated] = await db
    .update(subscriptionFeaturesTable)
    .set(updateSet as never)
    .where(eq(subscriptionFeaturesTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Feature not found" }); return; }
  res.json(serializeSubscriptionFeature(updated));
});

// DELETE /api/admin/subscription-features/:id
adminRouter.delete("/subscription-features/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(subscriptionFeaturesTable).where(eq(subscriptionFeaturesTable.id, id));
  res.status(204).send();
});

// GET /api/admin/businesses/:id/subscription
adminRouter.get("/businesses/:id/subscription", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.id, 10);
  const [sub] = await db.select().from(businessSubscriptionsTable).where(eq(businessSubscriptionsTable.businessId, businessId));
  if (!sub) { res.status(404).json({ error: "No subscription" }); return; }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));
  const featureKeys = await getBusinessFeatureKeys(businessId);
  const features = await getPlanFeatures(sub.planId);
  const enabledFeatures = features.filter((feature) => featureKeys.has(feature.key));

  res.json(serializeSubscription(sub, plan, enabledFeatures));
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

  const values: Record<string, unknown> = {
    planId: parsed.data.planId,
    status: parsed.data.status,
  };
  if (parsed.data.trialEndsAt) values.trialEndsAt = new Date(parsed.data.trialEndsAt);
  if (parsed.data.renewalAt) values.renewalAt = new Date(parsed.data.renewalAt);
  if (parsed.data.notes !== undefined) values.notes = parsed.data.notes;
  if (parsed.data.billingInterval) values.billingInterval = parsed.data.billingInterval;

  let sub;
  if (existing.length > 0) {
    [sub] = await db.update(businessSubscriptionsTable).set(values).where(eq(businessSubscriptionsTable.businessId, businessId)).returning();
  } else {
    [sub] = await db.insert(businessSubscriptionsTable).values({
      businessId,
      startedAt: new Date(),
      ...values,
    } as never).returning();
  }

  const featureKeys = await getBusinessFeatureKeys(businessId);
  const features = await getPlanFeatures(sub.planId);
  const enabledFeatures = features.filter((feature) => featureKeys.has(feature.key));

  res.json(serializeSubscription(sub, plan, enabledFeatures));
});

router.use("/admin", adminRouter);

// GET /api/pricing/plans — public pricing page data
router.get("/pricing/plans", async (_req, res): Promise<void> => {
  await ensureDefaultSubscriptionFeatures();
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.isActive, true))
    .orderBy(asc(subscriptionPlansTable.sortOrder), asc(subscriptionPlansTable.monthlyPrice));

  const publicPlans = plans.filter((plan) => plan.isPublic);
  const payload = await Promise.all(
    publicPlans.map(async (plan) => {
      const features = await getPlanFeatures(plan.id);
      return serializePublicPricingPlan(serializePlan(plan), features);
    }),
  );

  res.json(payload);
});

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
  const featureKeys = await getBusinessFeatureKeys(businessId);
  const features = await getPlanFeatures(sub.planId);
  const enabledFeatures = features.filter((feature) => featureKeys.has(feature.key));

  res.json(serializeSubscription(sub, plan, enabledFeatures));
});

// POST /api/businesses/:businessId/subscription/checkout
router.post("/businesses/:businessId/subscription/checkout", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.businessId, 10);
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = subscriptionCheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const result = await createSubscriptionCheckoutSession({
    businessId,
    planId: parsed.data.planId,
    interval: parsed.data.interval,
    userId,
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ url: result.url, mockMode: result.mockMode });
});

// POST /api/businesses/:businessId/subscription/portal
router.post("/businesses/:businessId/subscription/portal", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.businessId, 10);
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const result = await createCustomerPortalSession(businessId);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ url: result.url, mockMode: result.mockMode });
});

// POST /api/businesses/:businessId/subscription/sync — pull latest state from Stripe
router.post("/businesses/:businessId/subscription/sync", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.businessId, 10);
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsedBody = subscriptionSyncSchema.safeParse(req.body ?? {});

  const syncResult = await refreshBusinessSubscriptionFromStripe(businessId, {
    mockComplete: parsedBody.success ? parsedBody.data.mock === true : false,
    mockPlanId: parsedBody.success ? parsedBody.data.planId : undefined,
    mockInterval: parsedBody.success ? parsedBody.data.interval : undefined,
  });
  if (!syncResult.ok) {
    res.status(syncResult.status).json({ error: syncResult.error });
    return;
  }

  const [sub] = await db
    .select()
    .from(businessSubscriptionsTable)
    .where(eq(businessSubscriptionsTable.businessId, businessId));
  if (!sub) {
    res.status(404).json({ error: "No subscription" });
    return;
  }

  const [plan] = await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId));
  const featureKeys = await getBusinessFeatureKeys(businessId);
  const features = await getPlanFeatures(sub.planId);
  const enabledFeatures = features.filter((feature) => featureKeys.has(feature.key));

  res.json(serializeSubscription(sub, plan, enabledFeatures));
});

// POST /api/businesses/:businessId/subscription/change-plan
router.post("/businesses/:businessId/subscription/change-plan", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.businessId, 10);
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const parsed = subscriptionCheckoutSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const result = await changeBusinessSubscriptionPlan({
    businessId,
    planId: parsed.data.planId,
    interval: parsed.data.interval,
    userId,
  });

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  if (result.mode === "checkout") {
    res.json({ mode: "checkout", url: result.url, mockMode: result.mockMode });
    return;
  }

  const [sub] = await db.select().from(businessSubscriptionsTable).where(eq(businessSubscriptionsTable.businessId, businessId));
  const [plan] = sub
    ? await db.select().from(subscriptionPlansTable).where(eq(subscriptionPlansTable.id, sub.planId))
    : [undefined];
  const featureKeys = await getBusinessFeatureKeys(businessId);
  const features = sub ? await getPlanFeatures(sub.planId) : [];
  const enabledFeatures = features.filter((feature) => featureKeys.has(feature.key));

  res.json({
    mode: "updated",
    subscription: sub ? serializeSubscription(sub, plan, enabledFeatures) : null,
  });
});

// GET /api/businesses/:id/feature-access — subscription-aware UI for business owners
router.get("/businesses/:businessId/feature-access", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const businessId = parseInt(req.params.businessId, 10);

  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const isAdmin = user.role === "ADMIN";

  if (!isAdmin) {
    const [biz] = await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, businessId));
    if (!biz || biz.ownerId !== userId) {
      res.status(403).json({ error: "Forbidden: you do not own this business" });
      return;
    }
  }

  const report = await buildBusinessFeatureAccessReport(businessId, isAdmin);
  res.json(report);
});

export default router;
