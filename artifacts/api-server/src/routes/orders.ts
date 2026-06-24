import { Router, type IRouter } from "express";
import { db, ordersTable, orderItemsTable, productsTable, businessesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListBusinessOrdersParams,
  GetBusinessOrderSummaryParams,
  ListAllOrdersQueryParams,
  CreateCheckoutSessionBody,
} from "@workspace/api-zod";
import { createStripeCheckoutSession } from "../lib/stripe";
import { requireAuth } from "../middlewares/requireRole";
import {
  sendOrderNotification,
  buildOrderPlacedBusinessEmail,
  buildOrderConfirmationEmail,
  buildStatusUpdateEmail,
} from "../lib/notifications";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `LOH-${date}-${rand}`;
}

async function getOrderWithItems(orderId: number) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(eq(orderItemsTable.orderId, orderId));

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  return serializeOrder(order, items, business?.name ?? "Unknown");
}

function serializeOrder(
  order: typeof ordersTable.$inferSelect,
  items: typeof orderItemsTable.$inferSelect[],
  businessName: string,
) {
  return {
    id: order.id,
    businessId: order.businessId,
    businessName,
    orderNumber: order.orderNumber,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    deliveryAddress: order.deliveryAddress,
    pickupTime: order.pickupTime,
    notes: order.notes,
    specialFields: order.specialFields,
    total: parseFloat(order.total),
    deliveryFee: order.deliveryFee ? parseFloat(order.deliveryFee) : null,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    stripeSessionId: order.stripeSessionId,
    items: items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      subtotal: parseFloat(item.subtotal),
    })),
    createdAt: order.createdAt,
  };
}

// POST /api/orders
router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, d.businessId));

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }> = [];

  for (const item of d.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price);
    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;
    orderItems.push({
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: itemSubtotal,
    });
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, d.businessId));

  const deliveryFee =
    d.fulfillmentType === "DELIVERY" && business?.deliveryFee
      ? parseFloat(business.deliveryFee)
      : null;

  const total = subtotal + (deliveryFee ?? 0);

  const [order] = await db
    .insert(ordersTable)
    .values({
      businessId: d.businessId,
      orderNumber: generateOrderNumber(),
      fulfillmentType: d.fulfillmentType as never,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      deliveryAddress: d.deliveryAddress,
      pickupTime: d.pickupTime,
      notes: d.notes,
      specialFields: d.specialFields,
      total: String(total),
      deliveryFee: deliveryFee ? String(deliveryFee) : null,
      paymentMethod: d.paymentMethod ?? "STRIPE",
    })
    .returning();

  await db.insert(orderItemsTable).values(
    orderItems.map((item) => ({
      orderId: order.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      subtotal: String(item.subtotal),
    })),
  );

  const result = await getOrderWithItems(order.id);
  res.status(201).json(result);

  // ── Fire-and-forget notifications (never block the response) ──────────────
  const notifItems = orderItems.map((i) => ({
    productName: i.productName,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
  }));

  // Notify business owner
  if (business?.orderNotificationEmail) {
    const { subject, body } = buildOrderPlacedBusinessEmail({
      orderNumber: order.orderNumber,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      total,
      items: notifItems,
      fulfillmentType: d.fulfillmentType,
      notes: d.notes,
    });
    sendOrderNotification({
      type: "ORDER_PLACED_BUSINESS",
      businessId: business.id,
      orderId: order.id,
      recipientEmail: business.orderNotificationEmail,
      subject,
      body,
    }).catch(() => {});
  }

  // Send customer order confirmation
  if (d.customerEmail) {
    const { subject, body } = buildOrderConfirmationEmail({
      orderNumber: order.orderNumber,
      businessName: business?.name ?? "the business",
      total,
      items: notifItems,
      fulfillmentType: d.fulfillmentType,
      customerName: d.customerName,
    });
    sendOrderNotification({
      type: "ORDER_PLACED_CUSTOMER",
      businessId: d.businessId,
      orderId: order.id,
      recipientEmail: d.customerEmail,
      subject,
      body,
    }).catch(() => {});
  }
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse({ id: parseId(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const result = await getOrderWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(result);
});

// PATCH /api/orders/:id/status — requires auth (business owner or admin updates order status)
router.patch("/orders/:id/status", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse({
    id: parseId(req.params.id),
  });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(ordersTable)
    .set({ status: parsed.data.status as never })
    .where(eq(ordersTable.id, params.data.id));

  const result = await getOrderWithItems(params.data.id);
  if (!result) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(result);

  // ── Notify customer of status change (fire-and-forget) ────────────────────
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (order?.customerEmail) {
    const { subject, body } = buildStatusUpdateEmail({
      orderNumber: result.orderNumber,
      businessName: result.businessName,
      status: parsed.data.status,
      customerName: result.customerName,
    });
    sendOrderNotification({
      type: "ORDER_STATUS_UPDATE",
      businessId: result.businessId,
      orderId: result.id,
      recipientEmail: order.customerEmail,
      subject,
      body,
    }).catch(() => {});
  }
});

// GET /api/businesses/:businessId/orders
router.get(
  "/businesses/:businessId/orders",
  async (req, res): Promise<void> => {
    const params = ListBusinessOrdersParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const { status } = req.query as Record<string, string>;
    const conditions = [eq(ordersTable.businessId, params.data.businessId)];
    if (status) conditions.push(eq(ordersTable.status, status as never));

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(sql`${ordersTable.createdAt} DESC`);

    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, params.data.businessId));

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));
        return serializeOrder(order, items, business?.name ?? "Unknown");
      }),
    );

    res.json(ordersWithItems);
  },
);

// GET /api/businesses/:businessId/orders/summary
router.get(
  "/businesses/:businessId/orders/summary",
  async (req, res): Promise<void> => {
    const params = GetBusinessOrderSummaryParams.safeParse({
      businessId: parseId(req.params.businessId),
    });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const businessId = params.data.businessId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const allOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.businessId, businessId))
      .orderBy(sql`${ordersTable.createdAt} DESC`);

    const todayOrders = allOrders.filter((o) => o.createdAt >= todayStart);
    const pendingOrders = allOrders.filter((o) =>
      ["NEW", "CONFIRMED", "PREPARING"].includes(o.status),
    );
    const todayRevenue = todayOrders.reduce(
      (sum, o) => sum + parseFloat(o.total),
      0,
    );

    const [business] = await db
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));

    const recentRaw = allOrders.slice(0, 5);
    const recentOrders = await Promise.all(
      recentRaw.map(async (order) => {
        const items = await db
          .select()
          .from(orderItemsTable)
          .where(eq(orderItemsTable.orderId, order.id));
        return serializeOrder(order, items, business?.name ?? "Unknown");
      }),
    );

    res.json({
      todayCount: todayOrders.length,
      pendingCount: pendingOrders.length,
      todayRevenue,
      upcomingCount: pendingOrders.length,
      recentOrders,
    });
  },
);

// GET /api/admin/orders
router.get("/admin/orders", async (req, res): Promise<void> => {
  const queryParams = ListAllOrdersQueryParams.safeParse(req.query);
  if (!queryParams.success) {
    res.status(400).json({ error: queryParams.error.message });
    return;
  }

  const { businessId, status } = queryParams.data;
  const conditions: ReturnType<typeof eq>[] = [];
  if (businessId) conditions.push(eq(ordersTable.businessId, businessId));
  if (status) conditions.push(eq(ordersTable.status, status as never));

  const orders = await db
    .select()
    .from(ordersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  const businesses = await db.select().from(businessesTable);
  const bizMap = new Map(businesses.map((b) => [b.id, b.name]));

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await db
        .select()
        .from(orderItemsTable)
        .where(eq(orderItemsTable.orderId, order.id));
      return serializeOrder(order, items, bizMap.get(order.businessId) ?? "Unknown");
    }),
  );

  res.json(ordersWithItems);
});

// POST /api/checkout/session
router.post("/checkout/session", async (req, res): Promise<void> => {
  const parsed = CreateCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const order = await getOrderWithItems(parsed.data.orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const baseUrl =
    process.env.REPLIT_DOMAINS?.split(",")[0]
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "http://localhost:80";

  const result = await createStripeCheckoutSession(
    order.id,
    order.orderNumber,
    order.businessName,
    order.items.map((i) => ({
      name: i.productName,
      price: i.unitPrice,
      quantity: i.quantity,
    })),
    order.total,
    `${baseUrl}/order/${order.id}?payment=success`,
    `${baseUrl}/cart?payment=canceled`,
  );

  if (result.sessionId) {
    await db
      .update(ordersTable)
      .set({ stripeSessionId: result.sessionId })
      .where(eq(ordersTable.id, order.id));
  }

  res.json(result);
});

// POST /api/checkout/webhook (Stripe webhook)
router.post("/checkout/webhook", async (req, res): Promise<void> => {
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    res.status(400).json({ error: "No signature" });
    return;
  }

  try {
    res.json({ received: true });
  } catch {
    res.status(400).json({ error: "Webhook error" });
  }
});

export default router;
