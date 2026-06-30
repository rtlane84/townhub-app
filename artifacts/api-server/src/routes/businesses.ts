import { Router, type IRouter } from "express";
import {
  db,
  businessesTable,
  categoriesTable,
  productsTable,
  ordersTable,
  usersTable,
} from "@workspace/db";
import { eq, and, ilike, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessBySlugParams,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/requireRole";
import { resolveStructuredHoursInput, legacyHoursFromStructured } from "../lib/business-hours";
import { nullsToUndefinedTopLevel } from "../lib/request-body";
import { parseStructuredHours } from "@workspace/api-zod";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import { allowsOnlinePayment, resolvePaymentMode } from "@workspace/api-zod";
import { businessHasOnlinePaymentsReady } from "../lib/stripe-connect";
import { applyPaymentModeToUpdate, paymentModeForInsert } from "../lib/payment-mode";
import { defaultStorefrontModeForBusinessType, normalizeWebsiteUrl } from "@workspace/api-zod";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const router: IRouter = Router();

export function serializeBusiness(b: typeof businessesTable.$inferSelect) {
  const paymentMode = resolvePaymentMode(b);
  const onlinePaymentsAvailable =
    allowsOnlinePayment(paymentMode) && businessHasOnlinePaymentsReady(b);

  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    type: b.type,
    description: b.description,
    logoUrl: b.logoUrl,
    heroImageUrl: b.heroImageUrl,
    address: b.address,
    phone: b.phone,
    websiteUrl: b.websiteUrl,
    showWebsiteCard: b.showWebsiteCard,
    hours: b.hours,
    structuredHours: parseStructuredHours(b.structuredHours),
    active: b.active,
    featured: b.featured,
    pickupEnabled: b.pickupEnabled,
    deliveryEnabled: b.deliveryEnabled,
    deliveryFee: b.deliveryFee ? parseFloat(b.deliveryFee) : null,
    minimumOrder: b.minimumOrder ? parseFloat(b.minimumOrder) : null,
    minimumOrderForDelivery: b.minimumOrderForDelivery ? parseFloat(b.minimumOrderForDelivery) : null,
    deliveryRadiusMiles: b.deliveryRadiusMiles ? parseFloat(b.deliveryRadiusMiles) : null,
    deliveryNotes: b.deliveryNotes,
    pickupInstructions: b.pickupInstructions,
    deliveryInstructions: b.deliveryInstructions,
    payAtPickupEnabled: b.payAtPickupEnabled,
    paymentMode: b.paymentMode,
    onlinePaymentsAvailable,
    stripeConnectStatus: b.stripeConnectStatus,
    orderCutoffTime: b.orderCutoffTime,
    orderNotificationEmail: b.orderNotificationEmail,
    notificationEmail: b.notificationEmail ?? b.orderNotificationEmail,
    notificationPhone: b.notificationPhone,
    notifyNewOrdersByEmail: b.notifyNewOrdersByEmail,
    notifyNewOrdersBySms: b.notifyNewOrdersBySms,
    notifyAppointmentRequestsByEmail: b.notifyAppointmentRequestsByEmail,
    notifyAppointmentRequestsBySms: b.notifyAppointmentRequestsBySms,
    eventLocationEnabled: b.eventLocationEnabled,
    storefrontMode: b.storefrontMode,
    accentColor: b.accentColor,
    buttonColor: b.buttonColor,
    bannerText: b.bannerText,
    ownerId: b.ownerId,
    createdAt: b.createdAt,
  };
}

export function serializeProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    businessId: p.businessId,
    categoryId: p.categoryId,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    imageUrl: p.imageUrl,
    available: p.available,
    featured: p.featured,
    prepTimeMinutes: p.prepTimeMinutes,
  };
}

// GET /api/businesses
router.get("/businesses", async (req, res): Promise<void> => {
  const { type, search, featured } = req.query as Record<string, string>;

  const conditions: ReturnType<typeof eq>[] = [
    eq(businessesTable.active, true),
  ];
  if (type) conditions.push(eq(businessesTable.type, type as never));
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (featured === "true") conditions.push(eq(businessesTable.featured, true));

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(and(...conditions))
    .orderBy(businessesTable.featured, businessesTable.name);

  res.json(businesses.map(serializeBusiness));
});

// POST /api/businesses/register — self-service listing
router.post("/businesses/register", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Multi-business owners may register additional listings on the same account.
  const { name, type, description, address, phone, hours, structuredHours } = req.body as {
    name?: string;
    type?: string;
    description?: string;
    address?: string;
    phone?: string;
    hours?: string;
    structuredHours?: unknown;
  };

  if (!name?.trim() || !type?.trim()) {
    res.status(400).json({ error: "name and type are required." });
    return;
  }

  // Generate a unique slug
  let baseSlug = slugify(name);
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
      name: name.trim(),
      slug,
      type: type as never,
      description: description?.trim() || null,
      address: address?.trim() || null,
      phone: phone?.trim() || null,
      structuredHours: resolveStructuredHoursInput(structuredHours) ?? null,
      hours: legacyHoursFromStructured(structuredHours) ?? (hours?.trim() || null),
      ownerId: userId,
      pickupEnabled: true,
      payAtPickupEnabled: true,
      paymentMode: "BOTH",
      storefrontMode: defaultStorefrontModeForBusinessType(type),
    })
    .returning();

  // Promote user to BUSINESS_OWNER (upsert in case row doesn't exist yet)
  const claims = (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth?.sessionClaims;
  const email = (claims?.email as string) ?? `${userId}@user.local`;
  const userName = (claims?.name as string) ?? null;

  await db
    .insert(usersTable)
    .values({ id: userId, email, name: userName, role: "BUSINESS_OWNER" })
    .onConflictDoUpdate({ target: usersTable.id, set: { role: "BUSINESS_OWNER" } });

  req.log.info({ userId, businessId: business.id, slug }, "Business registered via self-service");
  res.status(201).json(serializeBusiness(business));
});

// GET /api/marketplace/stats — public homepage stats
router.get("/marketplace/stats", async (_req, res): Promise<void> => {
  const [shopRow] = await db
    .select({ value: count() })
    .from(businessesTable)
    .where(eq(businessesTable.active, true));

  const [itemRow] = await db
    .select({ value: count() })
    .from(productsTable)
    .innerJoin(businessesTable, eq(productsTable.businessId, businessesTable.id))
    .where(and(eq(businessesTable.active, true), eq(productsTable.available, true)));

  res.json({
    localShopsCount: shopRow?.value ?? 0,
    uniqueItemsCount: itemRow?.value ?? 0,
  });
});

// GET /api/businesses/stats — platform stats
router.get("/businesses/stats", async (req, res): Promise<void> => {
  const businesses = await db.select().from(businessesTable);
  const orders = await db.select().from(ordersTable);

  const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);

  res.json({
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((b) => b.active).length,
    totalOrders: orders.length,
    totalRevenue,
    recentOrders: [],
  });
});

// GET /api/businesses/checkout/:businessId — public checkout context (no auth)
router.get("/businesses/checkout/:businessId", async (req, res): Promise<void> => {
  const businessId = parseInt(Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId, 10);
  if (!Number.isFinite(businessId)) {
    res.status(400).json({ error: "Invalid business id" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(and(eq(businessesTable.id, businessId), eq(businessesTable.active, true)));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(serializeBusiness(business));
});

// GET /api/businesses/:slug — storefront
router.get("/businesses/:slug", async (req, res): Promise<void> => {
  const params = GetBusinessBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Prevent conflict with /businesses/manage, /businesses/stats, and /businesses/checkout
  if (["manage", "stats", "checkout"].includes(params.data.slug)) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.slug, params.data.slug),
        eq(businessesTable.active, true),
      ),
    );

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.businessId, business.id))
    .orderBy(categoriesTable.sortOrder, categoriesTable.name);

  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        eq(productsTable.businessId, business.id),
        eq(productsTable.available, true),
      ),
    )
    .orderBy(productsTable.featured, productsTable.name);

  res.json({
    business: serializeBusiness(business),
    categories,
    products: products.map(serializeProduct),
  });
});

// POST /api/businesses/manage
router.post("/businesses/manage", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const paymentFields = paymentModeForInsert({
    paymentMode: parsed.data.paymentMode,
    payAtPickupEnabled: parsed.data.payAtPickupEnabled,
  });

  const [business] = await db
    .insert(businessesTable)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      type: parsed.data.type as never,
      description: parsed.data.description,
      logoUrl: parsed.data.logoUrl,
      heroImageUrl: parsed.data.heroImageUrl,
      address: parsed.data.address,
      phone: parsed.data.phone,
      structuredHours: resolveStructuredHoursInput(parsed.data.structuredHours) ?? null,
      hours: legacyHoursFromStructured(parsed.data.structuredHours) ?? parsed.data.hours ?? null,
      pickupEnabled: parsed.data.pickupEnabled ?? true,
      deliveryEnabled: parsed.data.deliveryEnabled ?? false,
      deliveryFee: parsed.data.deliveryFee
        ? String(parsed.data.deliveryFee)
        : null,
      minimumOrder: parsed.data.minimumOrder
        ? String(parsed.data.minimumOrder)
        : null,
      payAtPickupEnabled: paymentFields.payAtPickupEnabled,
      paymentMode: paymentFields.paymentMode,
      orderCutoffTime: parsed.data.orderCutoffTime,
      ownerId: parsed.data.ownerId,
    })
    .returning();

  res.status(201).json(serializeBusiness(business));
});

// GET /api/businesses/manage/:id
router.get("/businesses/manage/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const access = await authorizeBusinessOwnerOrAdmin(req, params.data.id);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  res.json(serializeBusiness(access.business));
});

// PATCH /api/businesses/manage/:id
router.patch("/businesses/manage/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(nullsToUndefinedTopLevel(req.body));
  if (!parsed.success) {
    req.log?.warn({ err: parsed.error.flatten() }, "Invalid business update body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const access = await authorizeBusinessOwnerOrAdmin(req, params.data.id);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) updateData.name = d.name;
  if (d.slug !== undefined) updateData.slug = d.slug;
  if (d.type !== undefined) updateData.type = d.type;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.logoUrl !== undefined) updateData.logoUrl = d.logoUrl || null;
  if (d.heroImageUrl !== undefined) updateData.heroImageUrl = d.heroImageUrl || null;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.hours !== undefined) updateData.hours = d.hours;
  if (d.structuredHours !== undefined) {
    updateData.structuredHours = resolveStructuredHoursInput(d.structuredHours);
    updateData.hours = legacyHoursFromStructured(d.structuredHours);
  }
  if (d.active !== undefined) updateData.active = d.active;
  if (d.featured !== undefined) updateData.featured = d.featured;
  if (d.pickupEnabled !== undefined) updateData.pickupEnabled = d.pickupEnabled;
  if (d.deliveryEnabled !== undefined)
    updateData.deliveryEnabled = d.deliveryEnabled;
  if (d.deliveryFee !== undefined)
    updateData.deliveryFee = d.deliveryFee ? String(d.deliveryFee) : null;
  if (d.minimumOrder !== undefined)
    updateData.minimumOrder = d.minimumOrder ? String(d.minimumOrder) : null;
  applyPaymentModeToUpdate(updateData, {
    paymentMode: d.paymentMode,
    payAtPickupEnabled: d.payAtPickupEnabled,
  });
  if (d.orderCutoffTime !== undefined)
    updateData.orderCutoffTime = d.orderCutoffTime;
  if ((d as Record<string, unknown>).minimumOrderForDelivery !== undefined)
    updateData.minimumOrderForDelivery = (d as Record<string, unknown>).minimumOrderForDelivery
      ? String((d as Record<string, unknown>).minimumOrderForDelivery)
      : null;
  if ((d as Record<string, unknown>).deliveryRadiusMiles !== undefined)
    updateData.deliveryRadiusMiles = (d as Record<string, unknown>).deliveryRadiusMiles
      ? String((d as Record<string, unknown>).deliveryRadiusMiles)
      : null;
  if ((d as Record<string, unknown>).deliveryNotes !== undefined)
    updateData.deliveryNotes = (d as Record<string, unknown>).deliveryNotes;
  if ((d as Record<string, unknown>).pickupInstructions !== undefined)
    updateData.pickupInstructions = (d as Record<string, unknown>).pickupInstructions;
  if ((d as Record<string, unknown>).deliveryInstructions !== undefined)
    updateData.deliveryInstructions = (d as Record<string, unknown>).deliveryInstructions;
  if ((d as Record<string, unknown>).orderNotificationEmail !== undefined) {
    updateData.orderNotificationEmail = (d as Record<string, unknown>).orderNotificationEmail;
    if ((d as Record<string, unknown>).notificationEmail === undefined) {
      updateData.notificationEmail = (d as Record<string, unknown>).orderNotificationEmail;
    }
  }
  if ((d as Record<string, unknown>).notificationEmail !== undefined) {
    updateData.notificationEmail = (d as Record<string, unknown>).notificationEmail;
    updateData.orderNotificationEmail = (d as Record<string, unknown>).notificationEmail;
  }
  if ((d as Record<string, unknown>).notificationPhone !== undefined)
    updateData.notificationPhone = (d as Record<string, unknown>).notificationPhone;
  if ((d as Record<string, unknown>).notifyNewOrdersByEmail !== undefined)
    updateData.notifyNewOrdersByEmail = (d as Record<string, unknown>).notifyNewOrdersByEmail;
  if ((d as Record<string, unknown>).notifyNewOrdersBySms !== undefined)
    updateData.notifyNewOrdersBySms = (d as Record<string, unknown>).notifyNewOrdersBySms;
  if ((d as Record<string, unknown>).notifyAppointmentRequestsByEmail !== undefined)
    updateData.notifyAppointmentRequestsByEmail = (d as Record<string, unknown>).notifyAppointmentRequestsByEmail;
  if ((d as Record<string, unknown>).notifyAppointmentRequestsBySms !== undefined)
    updateData.notifyAppointmentRequestsBySms = (d as Record<string, unknown>).notifyAppointmentRequestsBySms;
  if ((d as Record<string, unknown>).eventLocationEnabled !== undefined)
    updateData.eventLocationEnabled = (d as Record<string, unknown>).eventLocationEnabled;
  if ((d as Record<string, unknown>).storefrontMode !== undefined)
    updateData.storefrontMode = (d as Record<string, unknown>).storefrontMode;
  if ((d as Record<string, unknown>).websiteUrl !== undefined) {
    const raw = (d as Record<string, unknown>).websiteUrl;
    updateData.websiteUrl =
      typeof raw === "string" && raw.trim() ? normalizeWebsiteUrl(raw) : null;
  }
  if ((d as Record<string, unknown>).showWebsiteCard !== undefined)
    updateData.showWebsiteCard = (d as Record<string, unknown>).showWebsiteCard;
  if ((d as Record<string, unknown>).accentColor !== undefined)
    updateData.accentColor = (d as Record<string, unknown>).accentColor;
  if ((d as Record<string, unknown>).buttonColor !== undefined)
    updateData.buttonColor = (d as Record<string, unknown>).buttonColor;
  if ((d as Record<string, unknown>).bannerText !== undefined)
    updateData.bannerText = (d as Record<string, unknown>).bannerText;

  try {
    const [business] = await db
      .update(businessesTable)
      .set(updateData as never)
      .where(eq(businessesTable.id, params.data.id))
      .returning();

    if (!business) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    res.json(serializeBusiness(business));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    req.log?.error({ err, businessId: params.data.id }, "Failed to update business");
    if (message.includes("structured_hours")) {
      res.status(500).json({
        error: "Database is missing the structured_hours column. Run: pnpm --filter @workspace/db run push",
      });
      return;
    }
    if (message.includes("payment_mode")) {
      res.status(500).json({
        error: "Database is missing the payment_mode column. Run: pnpm --filter @workspace/db run push",
      });
      return;
    }
    res.status(500).json({ error: "Failed to update business settings" });
  }
});

// DELETE /api/businesses/manage/:id
router.delete("/businesses/manage/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
