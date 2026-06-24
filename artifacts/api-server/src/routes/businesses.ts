import { Router, type IRouter } from "express";
import {
  db,
  businessesTable,
  categoriesTable,
  productsTable,
  ordersTable,
} from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateBusinessBody,
  UpdateBusinessBody,
  GetBusinessParams,
  UpdateBusinessParams,
  DeleteBusinessParams,
  GetBusinessBySlugParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

export function serializeBusiness(b: typeof businessesTable.$inferSelect) {
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
    hours: b.hours,
    active: b.active,
    featured: b.featured,
    pickupEnabled: b.pickupEnabled,
    deliveryEnabled: b.deliveryEnabled,
    deliveryFee: b.deliveryFee ? parseFloat(b.deliveryFee) : null,
    minimumOrder: b.minimumOrder ? parseFloat(b.minimumOrder) : null,
    payAtPickupEnabled: b.payAtPickupEnabled,
    orderCutoffTime: b.orderCutoffTime,
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

// GET /api/businesses/:slug — storefront
router.get("/businesses/:slug", async (req, res): Promise<void> => {
  const params = GetBusinessBySlugParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Prevent conflict with /businesses/manage and /businesses/stats
  if (["manage", "stats"].includes(params.data.slug)) {
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
router.post("/businesses/manage", async (req, res): Promise<void> => {
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
      hours: parsed.data.hours,
      pickupEnabled: parsed.data.pickupEnabled ?? true,
      deliveryEnabled: parsed.data.deliveryEnabled ?? false,
      deliveryFee: parsed.data.deliveryFee
        ? String(parsed.data.deliveryFee)
        : null,
      minimumOrder: parsed.data.minimumOrder
        ? String(parsed.data.minimumOrder)
        : null,
      payAtPickupEnabled: parsed.data.payAtPickupEnabled ?? false,
      orderCutoffTime: parsed.data.orderCutoffTime,
      ownerId: parsed.data.ownerId,
    })
    .returning();

  res.status(201).json(serializeBusiness(business));
});

// GET /api/businesses/manage/:id
router.get("/businesses/manage/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, params.data.id));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  res.json(serializeBusiness(business));
});

// PATCH /api/businesses/manage/:id
router.patch("/businesses/manage/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateBusinessParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.name !== undefined) updateData.name = d.name;
  if (d.slug !== undefined) updateData.slug = d.slug;
  if (d.description !== undefined) updateData.description = d.description;
  if (d.logoUrl !== undefined) updateData.logoUrl = d.logoUrl;
  if (d.heroImageUrl !== undefined) updateData.heroImageUrl = d.heroImageUrl;
  if (d.address !== undefined) updateData.address = d.address;
  if (d.phone !== undefined) updateData.phone = d.phone;
  if (d.hours !== undefined) updateData.hours = d.hours;
  if (d.active !== undefined) updateData.active = d.active;
  if (d.featured !== undefined) updateData.featured = d.featured;
  if (d.pickupEnabled !== undefined) updateData.pickupEnabled = d.pickupEnabled;
  if (d.deliveryEnabled !== undefined)
    updateData.deliveryEnabled = d.deliveryEnabled;
  if (d.deliveryFee !== undefined)
    updateData.deliveryFee = d.deliveryFee ? String(d.deliveryFee) : null;
  if (d.minimumOrder !== undefined)
    updateData.minimumOrder = d.minimumOrder ? String(d.minimumOrder) : null;
  if (d.payAtPickupEnabled !== undefined)
    updateData.payAtPickupEnabled = d.payAtPickupEnabled;
  if (d.orderCutoffTime !== undefined)
    updateData.orderCutoffTime = d.orderCutoffTime;

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
});

// DELETE /api/businesses/manage/:id
router.delete("/businesses/manage/:id", async (req, res): Promise<void> => {
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
