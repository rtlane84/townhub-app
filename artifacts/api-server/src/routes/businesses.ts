import { Router, type IRouter } from "express";
import {
  db,
  businessesTable,
  categoriesTable,
  productsTable,
  ordersTable,
  usersTable,
  foodTruckLocationsTable,
} from "@workspace/db";
import { eq, and, ilike, count, isNull, sum, inArray } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessBySlugParams,
  parseStructuredHours,
  isOpenNow,
  allowsOnlinePayment,
  resolvePaymentMode,
  resolveOrderingAvailabilityMode,
  resolveOrderClosingBufferMinutes,
  defaultStorefrontModeForBusinessType,
  resolveStorefrontMode,
  normalizeWebsiteUrl,
  normalizeLegacyBusinessType,
  type FoodTruckLocationWindow,
} from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/requireRole";
import { resolveStructuredHoursInput, legacyHoursFromStructured } from "../lib/business-hours";
import { nullsToUndefinedTopLevel } from "../lib/request-body";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import { isValidDiscordWebhookUrl } from "../lib/discord-webhook";
import {
  loadOptionGroupsByProductIds,
  loadAssignedModifierGroupsByProductIds,
  assignModifierGroupsToProduct,
  clearProductModifierGroups,
  type SerializedProductOptionGroup,
  type AssignedModifierGroupSummary,
} from "../lib/product-options";
import { businessHasOnlinePaymentsReady } from "../lib/stripe-connect";
import { applyPaymentModeToUpdate, paymentModeForInsert } from "../lib/payment-mode";
import { archiveBusiness } from "../lib/business-lifecycle";
import { buildNtfySubscriptionUrl } from "../lib/ntfy-config";
import { ntfySettingsForEnable } from "../lib/ntfy-business-settings";
import {
  isPostgresUniqueViolation,
  resolveUniqueBusinessSlug,
  slugifyFromBusinessName,
} from "../lib/business-slug";
import { evaluateBusinessOrderingAvailability } from "../lib/business-commerce-eligibility";

const router: IRouter = Router();

export function serializeBusiness(
  b: typeof businessesTable.$inferSelect,
  options?: { mobileLocations?: FoodTruckLocationWindow[] },
) {
  const paymentMode = resolvePaymentMode(b);
  const onlinePaymentsAvailable =
    allowsOnlinePayment(paymentMode) && businessHasOnlinePaymentsReady(b);
  const availability = evaluateBusinessOrderingAvailability(b, {
    mobileLocations: options?.mobileLocations,
  });
  const normalizedType = normalizeLegacyBusinessType(b.type);

  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    type: normalizedType.type,
    description: b.description,
    logoUrl: b.logoUrl,
    heroImageUrl: b.heroImageUrl,
    address: b.address,
    phone: b.phone,
    websiteUrl: b.websiteUrl,
    showWebsiteCard: b.showWebsiteCard,
    hours: b.hours,
    structuredHours: parseStructuredHours(b.structuredHours),
    hoursEnabled: b.hoursEnabled !== false,
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
    taxEnabled: b.taxEnabled,
    taxRatePercent: b.taxRatePercent ? parseFloat(b.taxRatePercent) : null,
    taxLabel: b.taxLabel,
    payAtPickupEnabled: b.payAtPickupEnabled,
    paymentMode: b.paymentMode,
    onlinePaymentsAvailable,
    stripeConnectStatus: b.stripeConnectStatus,
    orderCutoffTime: b.orderCutoffTime,
    defaultPrepMinutes: b.defaultPrepMinutes,
    deliveryBufferMinutes: b.deliveryBufferMinutes ?? 15,
    orderClosingBufferMinutes: b.orderClosingBufferMinutes ?? 0,
    orderNotificationEmail: b.orderNotificationEmail,
    notificationEmail: b.notificationEmail ?? b.orderNotificationEmail,
    notificationPhone: b.notificationPhone,
    notifyNewOrdersByEmail: b.notifyNewOrdersByEmail,
    notifyNewOrdersBySms: b.notifyNewOrdersBySms,
    notifyAppointmentRequestsByEmail: b.notifyAppointmentRequestsByEmail,
    notifyAppointmentRequestsBySms: b.notifyAppointmentRequestsBySms,
    discordWebhookUrl: b.discordWebhookUrl,
    notifyNewOrdersByDiscord: b.notifyNewOrdersByDiscord,
    notifyAppointmentRequestsByDiscord: b.notifyAppointmentRequestsByDiscord,
    ntfyEnabled: b.ntfyEnabled,
    notifyNewOrdersByNtfy: b.notifyNewOrdersByNtfy,
    notifyAppointmentRequestsByNtfy: b.notifyAppointmentRequestsByNtfy,
    ntfyTopic: b.ntfyTopic,
    ntfyConnectedAt: b.ntfyConnectedAt,
    ntfyLastTestAt: b.ntfyLastTestAt,
    ntfySubscriptionUrl: b.ntfyTopic ? buildNtfySubscriptionUrl(b.ntfyTopic) : null,
    isMobileBusiness: b.isMobileBusiness || normalizedType.isMobileBusiness,
    storefrontMode: resolveStorefrontMode({
      type: normalizedType.type,
      storefrontMode: b.storefrontMode,
    }),
    orderingAvailabilityMode: resolveOrderingAvailabilityMode(b),
    orderingEnabled: b.orderingEnabled ?? true,
    orderingAvailable: availability.available,
    orderingUnavailableReason: availability.reason,
    accentColor: b.accentColor,
    buttonColor: b.buttonColor,
    bannerText: b.bannerText,
    ownerId: b.ownerId,
    createdAt: b.createdAt,
  };
}

/** Public storefront/checkout responses — omits owner PII and internal notification settings. */
export function serializePublicBusiness(
  b: typeof businessesTable.$inferSelect,
  options?: { mobileLocations?: FoodTruckLocationWindow[] },
) {
  const {
    ownerId: _ownerId,
    orderNotificationEmail: _orderNotificationEmail,
    notificationEmail: _notificationEmail,
    notificationPhone: _notificationPhone,
    notifyNewOrdersByEmail: _notifyNewOrdersByEmail,
    notifyNewOrdersBySms: _notifyNewOrdersBySms,
    notifyAppointmentRequestsByEmail: _notifyAppointmentRequestsByEmail,
    notifyAppointmentRequestsBySms: _notifyAppointmentRequestsBySms,
    notifyNewOrdersByDiscord: _notifyNewOrdersByDiscord,
    notifyAppointmentRequestsByDiscord: _notifyAppointmentRequestsByDiscord,
    discordWebhookUrl: _discordWebhookUrl,
    ntfyEnabled: _ntfyEnabled,
    notifyNewOrdersByNtfy: _notifyNewOrdersByNtfy,
    notifyAppointmentRequestsByNtfy: _notifyAppointmentRequestsByNtfy,
    ntfyTopic: _ntfyTopic,
    ntfyConnectedAt: _ntfyConnectedAt,
    ntfyLastTestAt: _ntfyLastTestAt,
    ntfySubscriptionUrl: _ntfySubscriptionUrl,
    createdAt: _createdAt,
    ...publicBusiness
  } = serializeBusiness(b, options);
  return publicBusiness;
}

async function loadMobileLocationsForBusiness(
  businessId: number,
): Promise<FoodTruckLocationWindow[]> {
  const locs = await db
    .select({
      locationDate: foodTruckLocationsTable.locationDate,
      startTime: foodTruckLocationsTable.startTime,
      endTime: foodTruckLocationsTable.endTime,
      isActive: foodTruckLocationsTable.isActive,
    })
    .from(foodTruckLocationsTable)
    .where(eq(foodTruckLocationsTable.businessId, businessId));
  return locs;
}

export function serializeProduct(
  p: typeof productsTable.$inferSelect,
  optionGroups: SerializedProductOptionGroup[] = [],
  assignedModifierGroups: AssignedModifierGroupSummary[] = [],
) {
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
    taxable: p.taxable,
    optionGroups,
    assignedModifierGroups,
    modifierGroupIds: assignedModifierGroups.map((g) => g.id),
  };
}

// GET /api/businesses
router.get("/businesses", async (req, res): Promise<void> => {
  const { type, search, featured } = req.query as Record<string, string>;

  const conditions: ReturnType<typeof eq>[] = [
    eq(businessesTable.active, true),
    isNull(businessesTable.archivedAt),
  ];
  if (type) conditions.push(eq(businessesTable.type, type as never));
  if (search) conditions.push(ilike(businessesTable.name, `%${search}%`));
  if (featured === "true") conditions.push(eq(businessesTable.featured, true));

  const businesses = await db
    .select()
    .from(businessesTable)
    .where(and(...conditions))
    .orderBy(businessesTable.featured, businessesTable.name);

  const mobileBusinessIds = businesses
    .filter((business) => business.isMobileBusiness)
    .map((business) => business.id);

  const mobileLocationsByBusiness = new Map<number, FoodTruckLocationWindow[]>();
  if (mobileBusinessIds.length > 0) {
    const locs = await db
      .select({
        businessId: foodTruckLocationsTable.businessId,
        locationDate: foodTruckLocationsTable.locationDate,
        startTime: foodTruckLocationsTable.startTime,
        endTime: foodTruckLocationsTable.endTime,
        isActive: foodTruckLocationsTable.isActive,
      })
      .from(foodTruckLocationsTable)
      .where(
        and(
          inArray(foodTruckLocationsTable.businessId, mobileBusinessIds),
          eq(foodTruckLocationsTable.isActive, true),
        ),
      );

    for (const loc of locs) {
      const list = mobileLocationsByBusiness.get(loc.businessId) ?? [];
      list.push({
        locationDate: loc.locationDate,
        startTime: loc.startTime,
        endTime: loc.endTime,
        isActive: loc.isActive,
      });
      mobileLocationsByBusiness.set(loc.businessId, list);
    }
  }

  res.json(
    businesses.map((business) =>
      serializePublicBusiness(business, {
        mobileLocations: mobileLocationsByBusiness.get(business.id),
      }),
    ),
  );
});

// POST /api/businesses/register — admin-only direct business creation
router.post("/businesses/register", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const registerBodySchema = CreateBusinessBody.extend({
    slug: CreateBusinessBody.shape.slug.optional(),
  });
  const parsed = registerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const slug =
    parsed.data.slug ??
    (await resolveUniqueBusinessSlug(slugifyFromBusinessName(parsed.data.name)));

  const paymentFields = paymentModeForInsert({
    paymentMode: parsed.data.paymentMode,
    payAtPickupEnabled: parsed.data.payAtPickupEnabled ?? true,
  });
  const normalizedType = normalizeLegacyBusinessType(parsed.data.type);

  // Create the business
  let business;
  try {
    [business] = await db
      .insert(businessesTable)
      .values({
        name: parsed.data.name,
        slug,
        type: normalizedType.type as never,
        description: parsed.data.description ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
        heroImageUrl: parsed.data.heroImageUrl ?? null,
        address: parsed.data.address ?? null,
        phone: parsed.data.phone ?? null,
        structuredHours: resolveStructuredHoursInput(parsed.data.structuredHours) ?? null,
        hours:
          legacyHoursFromStructured(parsed.data.structuredHours) ??
          parsed.data.hours ??
          null,
        ownerId: parsed.data.ownerId ?? userId,
        pickupEnabled: parsed.data.pickupEnabled ?? true,
        deliveryEnabled: parsed.data.deliveryEnabled ?? false,
        deliveryFee: parsed.data.deliveryFee ? String(parsed.data.deliveryFee) : null,
        minimumOrder: parsed.data.minimumOrder ? String(parsed.data.minimumOrder) : null,
        payAtPickupEnabled: paymentFields.payAtPickupEnabled,
        paymentMode: paymentFields.paymentMode,
        orderCutoffTime: parsed.data.orderCutoffTime ?? null,
        ...(parsed.data.defaultPrepMinutes != null
          ? { defaultPrepMinutes: parsed.data.defaultPrepMinutes }
          : {}),
        ...(parsed.data.orderClosingBufferMinutes != null
          ? {
              orderClosingBufferMinutes: resolveOrderClosingBufferMinutes(
                parsed.data.orderClosingBufferMinutes,
              ),
            }
          : {}),
        isMobileBusiness: normalizedType.isMobileBusiness,
        eventLocationEnabled: normalizedType.isMobileBusiness,
        storefrontMode: defaultStorefrontModeForBusinessType(normalizedType.type),
      })
      .returning();
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      res.status(409).json({
        error: "That storefront URL is already in use. Please try a different business name.",
      });
      return;
    }
    throw err;
  }

  // Promote user to BUSINESS_OWNER (upsert in case row doesn't exist yet)
  const claims = (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth?.sessionClaims;
  const email = (claims?.email as string) ?? `${userId}@user.local`;
  const userName = (claims?.name as string) ?? null;

  await db
    .insert(usersTable)
    .values({ id: userId, email, name: userName, role: "BUSINESS_OWNER" })
    .onConflictDoUpdate({ target: usersTable.id, set: { role: "BUSINESS_OWNER" } });

  req.log.info({ adminId: userId, businessId: business.id, slug }, "Business registered by admin");
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

  const activeShops = await db
    .select({
      structuredHours: businessesTable.structuredHours,
      hoursEnabled: businessesTable.hoursEnabled,
    })
    .from(businessesTable)
    .where(eq(businessesTable.active, true));

  const openShopsCount = activeShops.reduce((total, shop) => {
    if (shop.hoursEnabled === false) return total;
    const hours = parseStructuredHours(shop.structuredHours);
    if (!hours || !isOpenNow(hours)) return total;
    return total + 1;
  }, 0);

  res.json({
    localShopsCount: shopRow?.value ?? 0,
    openShopsCount,
    uniqueItemsCount: itemRow?.value ?? 0,
  });
});

// GET /api/businesses/stats — platform stats (admin only)
router.get("/businesses/stats", requireAdmin, async (req, res): Promise<void> => {
  const [totalBusinessesResult, activeBusinessesResult, orderStatsResult] =
    await Promise.all([
      db.select({ value: count() }).from(businessesTable),
      db
        .select({ value: count() })
        .from(businessesTable)
        .where(eq(businessesTable.active, true)),
      db
        .select({ totalOrders: count(), totalRevenue: sum(ordersTable.total) })
        .from(ordersTable),
    ]);

  const totalBusinesses = totalBusinessesResult[0]?.value ?? 0;
  const activeBusinesses = activeBusinessesResult[0]?.value ?? 0;
  const totalOrders = orderStatsResult[0]?.totalOrders ?? 0;
  const parsedRevenue = Number.parseFloat(orderStatsResult[0]?.totalRevenue ?? "0");

  res.json({
    totalBusinesses,
    activeBusinesses,
    totalOrders,
    totalRevenue: Number.isFinite(parsedRevenue) ? parsedRevenue : 0,
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

  const mobileLocations =
    business.orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE"
      ? await loadMobileLocationsForBusiness(business.id)
      : undefined;
  res.json(serializePublicBusiness(business, { mobileLocations }));
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
        isNull(businessesTable.archivedAt),
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
    .where(eq(productsTable.businessId, business.id))
    // Unavailable items stay listed as Sold out; ordering is enforced server-side.
    .orderBy(productsTable.featured, productsTable.name);

  const optionGroupsByProduct = await loadOptionGroupsByProductIds(
    products.map((p) => p.id),
    { activeOnly: true },
  );

  const mobileLocations =
    business.orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE"
      ? await loadMobileLocationsForBusiness(business.id)
      : undefined;

  res.json({
    business: serializePublicBusiness(business, { mobileLocations }),
    categories,
    products: products.map((p) =>
      serializeProduct(p, optionGroupsByProduct.get(p.id) ?? []),
    ),
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
  const normalizedType = normalizeLegacyBusinessType(parsed.data.type);

  let business;
  try {
    [business] = await db
      .insert(businessesTable)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: normalizedType.type as never,
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
        ...(parsed.data.orderClosingBufferMinutes != null
          ? {
              orderClosingBufferMinutes: resolveOrderClosingBufferMinutes(
                parsed.data.orderClosingBufferMinutes,
              ),
            }
          : {}),
        isMobileBusiness: normalizedType.isMobileBusiness,
        eventLocationEnabled: normalizedType.isMobileBusiness,
        storefrontMode: defaultStorefrontModeForBusinessType(normalizedType.type),
        ownerId: parsed.data.ownerId,
      })
      .returning();
  } catch (err) {
    if (isPostgresUniqueViolation(err)) {
      res.status(409).json({
        error: "That storefront URL is already in use. Please choose a different one.",
      });
      return;
    }
    throw err;
  }

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
  if (d.type !== undefined) {
    const normalized = normalizeLegacyBusinessType(String(d.type));
    updateData.type = normalized.type;
    if (normalized.isMobileBusiness) {
      updateData.isMobileBusiness = true;
      updateData.eventLocationEnabled = true;
    }
  }
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
  if ((d as Record<string, unknown>).hoursEnabled !== undefined)
    updateData.hoursEnabled = (d as Record<string, unknown>).hoursEnabled === true;
  if (d.active !== undefined && access.isAdmin) updateData.active = d.active;
  if (d.featured !== undefined && access.isAdmin) updateData.featured = d.featured;
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
  if ((d as Record<string, unknown>).defaultPrepMinutes !== undefined)
    updateData.defaultPrepMinutes = (d as Record<string, unknown>).defaultPrepMinutes;
  if ((d as Record<string, unknown>).deliveryBufferMinutes !== undefined)
    updateData.deliveryBufferMinutes = (d as Record<string, unknown>).deliveryBufferMinutes;
  if ((d as Record<string, unknown>).orderClosingBufferMinutes !== undefined)
    updateData.orderClosingBufferMinutes = resolveOrderClosingBufferMinutes(
      (d as Record<string, unknown>).orderClosingBufferMinutes,
    );
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
  if (d.taxEnabled !== undefined) updateData.taxEnabled = d.taxEnabled;
  if (d.taxRatePercent !== undefined) {
    updateData.taxRatePercent =
      d.taxRatePercent != null ? String(d.taxRatePercent) : null;
  }
  if (d.taxLabel !== undefined) updateData.taxLabel = d.taxLabel?.trim() || "Sales Tax";
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
  if ((d as Record<string, unknown>).discordWebhookUrl !== undefined) {
    const raw = String((d as Record<string, unknown>).discordWebhookUrl ?? "").trim();
    if (raw && !isValidDiscordWebhookUrl(raw)) {
      res.status(400).json({
        error: "Enter a valid Discord webhook URL (https://discord.com/api/webhooks/...)",
      });
      return;
    }
    updateData.discordWebhookUrl = raw || null;
  }
  if ((d as Record<string, unknown>).notifyNewOrdersByDiscord !== undefined)
    updateData.notifyNewOrdersByDiscord = (d as Record<string, unknown>).notifyNewOrdersByDiscord;
  if ((d as Record<string, unknown>).notifyAppointmentRequestsByDiscord !== undefined)
    updateData.notifyAppointmentRequestsByDiscord = (d as Record<string, unknown>).notifyAppointmentRequestsByDiscord;
  if ((d as Record<string, unknown>).ntfyEnabled !== undefined) {
    const enabled = (d as Record<string, unknown>).ntfyEnabled === true;
    if (enabled) {
      Object.assign(updateData, ntfySettingsForEnable(access.business));
      updateData.notifyNewOrdersByNtfy = true;
      updateData.notifyAppointmentRequestsByNtfy = true;
    } else {
      updateData.ntfyEnabled = false;
      updateData.notifyNewOrdersByNtfy = false;
      updateData.notifyAppointmentRequestsByNtfy = false;
    }
  }
  if ((d as Record<string, unknown>).notifyNewOrdersByNtfy !== undefined)
    updateData.notifyNewOrdersByNtfy = (d as Record<string, unknown>).notifyNewOrdersByNtfy;
  if ((d as Record<string, unknown>).notifyAppointmentRequestsByNtfy !== undefined)
    updateData.notifyAppointmentRequestsByNtfy = (d as Record<string, unknown>).notifyAppointmentRequestsByNtfy;
  if ((d as Record<string, unknown>).isMobileBusiness !== undefined) {
    const enabled = (d as Record<string, unknown>).isMobileBusiness === true;
    updateData.isMobileBusiness = enabled;
    updateData.eventLocationEnabled = enabled;
  }
  // Legacy client field — map to isMobileBusiness
  if ((d as Record<string, unknown>).eventLocationEnabled !== undefined) {
    const enabled = (d as Record<string, unknown>).eventLocationEnabled === true;
    updateData.isMobileBusiness = enabled;
    updateData.eventLocationEnabled = enabled;
  }
  if ((d as Record<string, unknown>).storefrontMode !== undefined)
    updateData.storefrontMode = (d as Record<string, unknown>).storefrontMode;
  if ((d as Record<string, unknown>).orderingAvailabilityMode !== undefined)
    updateData.orderingAvailabilityMode = (d as Record<string, unknown>).orderingAvailabilityMode;
  if ((d as Record<string, unknown>).orderingEnabled !== undefined)
    updateData.orderingEnabled = (d as Record<string, unknown>).orderingEnabled;
  if ((d as Record<string, unknown>).websiteUrl !== undefined) {
    const raw = (d as Record<string, unknown>).websiteUrl;
    updateData.websiteUrl =
      typeof raw === "string" && raw.trim() ? normalizeWebsiteUrl(raw) : null;
  }
  if ((d as Record<string, unknown>).showWebsiteCard !== undefined)
    updateData.showWebsiteCard = (d as Record<string, unknown>).showWebsiteCard;
  if ((d as Record<string, unknown>).accentColor !== undefined) {
    const raw = (d as Record<string, unknown>).accentColor;
    updateData.accentColor = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  if ((d as Record<string, unknown>).buttonColor !== undefined) {
    const raw = (d as Record<string, unknown>).buttonColor;
    updateData.buttonColor = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }
  if ((d as Record<string, unknown>).bannerText !== undefined) {
    const raw = (d as Record<string, unknown>).bannerText;
    updateData.bannerText = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  }

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

// DELETE /api/businesses/manage/:id — archive business (admin)
router.delete("/businesses/manage/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await archiveBusiness(params.data.id);
  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      stripeError: result.stripeError,
    });
    return;
  }

  req.log.info(
    {
      businessId: params.data.id,
      subscriptionCanceled: result.subscriptionCanceled,
      hadActiveSubscription: result.hadActiveSubscription,
      alreadyArchived: result.alreadyArchived ?? false,
    },
    "Business archived",
  );

  res.json({
    archived: result.archived,
    subscriptionCanceled: result.subscriptionCanceled,
    hadActiveSubscription: result.hadActiveSubscription,
    alreadyArchived: result.alreadyArchived ?? false,
  });
});

export default router;
