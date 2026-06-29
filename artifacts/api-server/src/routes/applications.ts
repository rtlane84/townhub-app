import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  businessApplicationsTable,
  businessesTable,
  usersTable,
  subscriptionPlansTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireRole";
import {
  attachPlanToBusiness,
  resolveApprovalPlan,
} from "../lib/subscription-plans";
import { resolveStructuredHoursInput, legacyHoursFromStructured } from "../lib/business-hours";
import { parseStructuredHours } from "@workspace/api-zod";

const router: IRouter = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function serializeApplication(
  a: typeof businessApplicationsTable.$inferSelect,
  plan?: typeof subscriptionPlansTable.$inferSelect | null,
) {
  return {
    id: a.id,
    userId: a.userId,
    userEmail: a.userEmail,
    name: a.name,
    type: a.type,
    description: a.description,
    address: a.address,
    phone: a.phone,
    hours: a.hours,
    structuredHours: parseStructuredHours(a.structuredHours),
    planId: a.planId,
    planName: plan?.name ?? null,
    status: a.status,
    reviewNote: a.reviewNote,
    reviewedAt: a.reviewedAt,
    businessId: a.businessId,
    createdAt: a.createdAt,
  };
}

const applySchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  hours: z.string().optional(),
  structuredHours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: z.string().nullable(),
    closeTime: z.string().nullable(),
  })).optional(),
  planId: z.number().int().positive().optional(),
});

const approveSchema = z.object({
  planId: z.number().int().positive().optional(),
});

// GET /api/subscription-plans — public list of active plans for the apply form
router.get("/subscription-plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(subscriptionPlansTable)
    .where(eq(subscriptionPlansTable.isActive, true))
    .orderBy(subscriptionPlansTable.monthlyPrice);

  res.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      monthlyPrice: parseFloat(p.monthlyPrice),
      setupFee: p.setupFee ? parseFloat(p.setupFee) : null,
      transactionFeePercent: p.transactionFeePercent ? parseFloat(p.transactionFeePercent) : null,
      trialDays: p.trialDays,
      isDefault: p.isDefault,
    })),
  );
});

// GET /api/businesses/my-application — current user's application status (for apply flow)
router.get("/businesses/my-application", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [application] = await db
    .select()
    .from(businessApplicationsTable)
    .where(eq(businessApplicationsTable.userId, userId));

  if (!application) {
    res.status(404).json({ error: "No application found" });
    return;
  }

  let plan = null;
  if (application.planId) {
    [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(eq(subscriptionPlansTable.id, application.planId));
  }

  res.json(serializeApplication(application, plan));
});

// POST /api/businesses/apply — submit a business listing application
router.post("/businesses/apply", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check for existing pending application or active business
  const [existingApp] = await db
    .select()
    .from(businessApplicationsTable)
    .where(eq(businessApplicationsTable.userId, userId));

  if (existingApp?.status === "PENDING") {
    res.status(409).json({ error: "You already have a pending application." });
    return;
  }
  if (existingApp?.status === "APPROVED") {
    res.status(409).json({ error: "Your application has already been approved." });
    return;
  }

  const [existingBiz] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, userId));

  if (existingBiz) {
    res.status(409).json({ error: "You already have a business listed." });
    return;
  }

  const claims = (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth?.sessionClaims;
  const email = (claims?.email as string) ?? `${userId}@user.local`;

  const { name, type, description, address, phone, hours, structuredHours, planId } = parsed.data;

  if (planId) {
    const [plan] = await db
      .select()
      .from(subscriptionPlansTable)
      .where(and(eq(subscriptionPlansTable.id, planId), eq(subscriptionPlansTable.isActive, true)));
    if (!plan) {
      res.status(400).json({ error: "Selected plan is not available." });
      return;
    }
  }

  // Insert or update (if previously rejected, allow reapplication)
  let application;
  if (existingApp?.status === "REJECTED") {
    const [updated] = await db
      .update(businessApplicationsTable)
      .set({
        name: name.trim(),
        type,
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        structuredHours: resolveStructuredHoursInput(structuredHours) ?? null,
        hours: legacyHoursFromStructured(structuredHours) ?? (hours?.trim() || null),
        planId: planId ?? null,
        status: "PENDING",
        reviewNote: null,
        reviewedAt: null,
        reviewedBy: null,
        userEmail: email,
      })
      .where(eq(businessApplicationsTable.id, existingApp.id))
      .returning();
    application = updated;
  } else {
    const [created] = await db
      .insert(businessApplicationsTable)
      .values({
        userId,
        userEmail: email,
        name: name.trim(),
        type,
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        structuredHours: resolveStructuredHoursInput(structuredHours) ?? null,
        hours: legacyHoursFromStructured(structuredHours) ?? (hours?.trim() || null),
        planId: planId ?? null,
        status: "PENDING",
      })
      .returning();
    application = created;
  }

  req.log.info({ userId, applicationId: application.id }, "Business application submitted");
  res.status(201).json(serializeApplication(application));
});

// GET /api/admin/applications — list all applications (admin)
router.get("/admin/applications", requireAdmin, async (req, res): Promise<void> => {
  const apps = await db
    .select()
    .from(businessApplicationsTable)
    .orderBy(desc(businessApplicationsTable.createdAt));

  const allPlans = await db.select().from(subscriptionPlansTable);
  const allPlanMap = new Map(allPlans.map((p) => [p.id, p]));

  res.json(apps.map((a) => serializeApplication(a, a.planId ? allPlanMap.get(a.planId) : null)));
});

// POST /api/admin/applications/:id/approve — approve and create the business (admin)
router.post("/admin/applications/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsedBody = approveSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  const id = parseInt(String(req.params.id), 10);

  try {
    const [app] = await db
      .select()
      .from(businessApplicationsTable)
      .where(eq(businessApplicationsTable.id, id));

    if (!app) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    if (app.status !== "PENDING") {
      res.status(409).json({ error: `Application is already ${app.status.toLowerCase()}.` });
      return;
    }

    // Validate that the type is a known enum value; fall back to GENERAL
    const VALID_TYPES = [
      "FOOD_VENDOR", "FLORIST", "GARDEN_MARKET", "RETAIL_STORE",
      "BUILDING_SUPPLY", "SERVICE_PROVIDER", "FUNERAL_SERVICE", "GENERAL", "SALON",
    ];
    const safeType = VALID_TYPES.includes(app.type) ? app.type : "GENERAL";

    // Generate a unique slug
    let baseSlug = slugify(app.name);
    if (!baseSlug) baseSlug = "business";
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const [conflict] = await db
        .select({ id: businessesTable.id })
        .from(businessesTable)
        .where(eq(businessesTable.slug, slug));
      if (!conflict) break;
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    // Create the business
    const [business] = await db
      .insert(businessesTable)
      .values({
        name: app.name,
        slug,
        type: safeType as never,
        description: app.description,
        address: app.address,
        phone: app.phone,
        hours: app.hours,
        structuredHours: app.structuredHours,
        ownerId: app.userId,
        pickupEnabled: true,
        payAtPickupEnabled: true,
        paymentMode: "BOTH",
        active: true,
      })
      .returning();

    // Promote user to BUSINESS_OWNER
    await db
      .insert(usersTable)
      .values({ id: app.userId, email: app.userEmail ?? `${app.userId}@user.local`, role: "BUSINESS_OWNER" })
      .onConflictDoUpdate({ target: usersTable.id, set: { role: "BUSINESS_OWNER" } });

    // Attach subscription: admin override > application plan > default active plan
    const plan = await resolveApprovalPlan(app.planId, parsedBody.data.planId);
    if (plan) {
      await attachPlanToBusiness(business.id, plan);
    }

    // Mark application as approved
    await db
      .update(businessApplicationsTable)
      .set({
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: userId,
        businessId: business.id,
      })
      .where(eq(businessApplicationsTable.id, id));

    req.log.info(
      { adminId: userId, applicationId: id, businessId: business.id },
      "Business application approved",
    );
    res.json({ message: "Application approved. Business created.", businessId: business.id });
  } catch (err) {
    req.log.error({ err, applicationId: id }, "Failed to approve application");
    res.status(500).json({ error: "Failed to approve application. Please try again." });
  }
});

// POST /api/admin/applications/:id/reject — reject an application (admin)
router.post("/admin/applications/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(String(req.params.id), 10);
  const { note } = req.body as { note?: string };

  const [app] = await db
    .select()
    .from(businessApplicationsTable)
    .where(eq(businessApplicationsTable.id, id));

  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  if (app.status !== "PENDING") {
    res.status(409).json({ error: `Application is already ${app.status.toLowerCase()}.` });
    return;
  }

  await db
    .update(businessApplicationsTable)
    .set({
      status: "REJECTED",
      reviewNote: note?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy: userId,
    })
    .where(eq(businessApplicationsTable.id, id));

  req.log.info({ adminId: userId, applicationId: id }, "Business application rejected");
  res.json({ message: "Application rejected." });
});

export default router;
