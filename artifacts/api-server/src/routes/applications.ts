import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  businessApplicationsTable,
  businessesTable,
  usersTable,
  subscriptionPlansTable,
  businessSubscriptionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

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

  const { name, type, description, address, phone, hours, planId } = parsed.data;

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
        hours: hours?.trim() || null,
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
        hours: hours?.trim() || null,
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
router.get("/admin/applications", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const apps = await db
    .select()
    .from(businessApplicationsTable)
    .orderBy(desc(businessApplicationsTable.createdAt));

  const planIds = [...new Set(apps.map((a) => a.planId).filter(Boolean))] as number[];
  const plans = planIds.length
    ? await db
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, planIds[0]))
    : [];

  const planMap = new Map(plans.map((p) => [p.id, p]));

  // Also fetch all plans for lookup
  const allPlans = await db.select().from(subscriptionPlansTable);
  const allPlanMap = new Map(allPlans.map((p) => [p.id, p]));

  res.json(apps.map((a) => serializeApplication(a, a.planId ? allPlanMap.get(a.planId) : null)));
  void planMap;
});

// POST /api/admin/applications/:id/approve — approve and create the business (admin)
router.post("/admin/applications/:id/approve", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id, 10);

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
      "BUILDING_SUPPLY", "SERVICE_PROVIDER", "FUNERAL_SERVICE", "GENERAL",
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
        ownerId: app.userId,
        pickupEnabled: true,
        payAtPickupEnabled: true,
        active: true,
      })
      .returning();

    // Promote user to BUSINESS_OWNER
    await db
      .insert(usersTable)
      .values({ id: app.userId, email: app.userEmail ?? `${app.userId}@user.local`, role: "BUSINESS_OWNER" })
      .onConflictDoUpdate({ target: usersTable.id, set: { role: "BUSINESS_OWNER" } });

    // Attach subscription if a plan was selected
    if (app.planId) {
      const [plan] = await db
        .select()
        .from(subscriptionPlansTable)
        .where(eq(subscriptionPlansTable.id, app.planId));

      if (plan) {
        const trialEndsAt =
          plan.trialDays > 0
            ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
            : null;

        await db.insert(businessSubscriptionsTable).values({
          businessId: business.id,
          planId: plan.id,
          status: plan.trialDays > 0 ? "TRIALING" : "ACTIVE",
          trialEndsAt,
        });
      }
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
router.post("/admin/applications/:id/reject", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id, 10);
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
