import { Router, type IRouter } from "express";
import { respondOrderNotFound } from "../lib/order-not-found-response";
import {
  db,
  ordersTable,
  orderItemsTable,
  orderItemOptionsTable,
  orderIdempotencyKeysTable,
  productsTable,
  businessesTable,
  usersTable,
  foodTruckLocationsTable,
} from "@workspace/db";
import { eq, and, sql, inArray, gte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  CreateOrderBody,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  ListBusinessOrdersParams,
  GetBusinessOrderSummaryParams,
  ListAllOrdersQueryParams,
  CreateCheckoutSessionBody,
  RefundOrderParams,
  RefundOrderBody,
  EstimateOrderPrepBody,
} from "@workspace/api-zod";
import { createStripeCheckoutSession, stripe, isMockMode, retrieveOpenStripeCheckoutSession } from "../lib/stripe";
import { logOperationalFailure } from "../lib/operational-log";
import { respondIfUserDisabled } from "../lib/user-account-status";
import { recordStripeWebhookReceived } from "../lib/system-runtime-state";
import { handleStripeWebhookEvent, verifyStripeWebhookSignature } from "../lib/stripe-webhook";
import { validatePaymentMethodForBusiness, parseOrderPaymentMethod } from "../lib/payment-mode";
import { validateOnlineCardPaymentReady } from "../lib/stripe-connect";
import { getAppBaseUrl } from "../lib/app-base-url";
import { isMockCheckoutAllowed } from "../lib/stripe-config";
import { requireAuth } from "../middlewares/requireRole";
import {
  notifyOwnerNewOrderFromOrderId,
  notifyCustomerOrderReceived,
  notifyCustomerOrderStatusChange,
} from "../lib/notifications";
import {
  publishOrderCreatedLiveEvent,
  publishOrderRefundedLiveEvent,
  publishOrderUpdatedLiveEvent,
} from "../lib/business-live-events";
import { authorizeOrderStatusUpdate } from "../lib/order-access";
import { validateGuestOrderContact } from "../lib/guest-checkout";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  createOrderRefund,
  serializeOrderRefunds,
  authorizeOrderRefund,
} from "../lib/order-refund";
import {
  notifyCustomerOrderRefund,
  notifyOwnerRefundFailed,
} from "../lib/notification-service";
import {
  loadOptionGroupsByProductIds,
  validateOrderItemSelections,
  type OrderOptionSnapshot,
} from "../lib/product-options";
import { createOrderAccessToken } from "../lib/order-access-token";
import {
  findOrderIdByIdempotencyKey,
} from "../lib/order-idempotency";
import { isPostgresUniqueViolation } from "../lib/business-slug";
import {
  authorizeOrderAccess,
  buildOrderAccessInput,
  extractOrderAccessToken,
} from "../lib/order-request-access";
import {
  BUSINESS_NOT_ACCEPTING_ORDERS_MESSAGE,
  evaluateBusinessOrderingAvailability,
  requireOnlineOrderingFeature,
} from "../lib/business-commerce-guards";
import { allocateBusinessOrderNumber } from "../lib/business-order-number";
import {
  calculateOrderPrepEstimate,
  serializePrepEstimate,
} from "../lib/order-prep-estimate";
import {
  buildStripeCheckoutLineItems,
  calculateOrderTotals,
  centsToDollars,
  dollarsToCents,
  resolveOrderTotalsDisplay,
} from "@workspace/api-zod";
import type { Request } from "express";
import type { UserRole } from "../lib/order-access";
import {
  ACTIVE_KITCHEN_ORDER_STATUSES,
  parseBusinessOrderListQuery,
} from "../lib/order-list-query";
import {
  getOrderWithItems,
  serializeOrdersBatch,
  loadBusinessNameMap,
} from "../lib/order-serialization";
import { loadBusinessOrderSummary } from "../lib/business-order-summary";

const router: IRouter = Router();

async function loadOrderViewerContext(
  req: Request,
  businessId: number,
): Promise<{
  viewerUserId: string | null | undefined;
  viewerRole: UserRole | null;
  businessOwnerId: string | null;
  accessToken: string | null;
}> {
  const { userId } = getAuth(req);
  let viewerRole: UserRole | null = null;
  let businessOwnerId: string | null = null;

  if (userId) {
    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    viewerRole = user?.role ?? null;

    const [business] = await db
      .select({ ownerId: businessesTable.ownerId })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));
    businessOwnerId = business?.ownerId ?? null;
  }

  return {
    viewerUserId: userId,
    viewerRole,
    businessOwnerId,
    accessToken: extractOrderAccessToken(req),
  };
}

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TH-${date}-${rand}`;
}

async function resolveIncludeRefundDetails(
  req: Parameters<typeof authorizeBusinessOwnerOrAdmin>[0],
  businessId: number,
): Promise<boolean> {
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  return access.ok;
}

// POST /api/orders/prep-estimate
router.post("/orders/prep-estimate", async (req, res): Promise<void> => {
  const parsed = EstimateOrderPrepBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  if (!d.items.length) {
    res.status(400).json({ error: "At least one item is required" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, d.businessId));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, d.businessId));

  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of d.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
  }

  const estimate = calculateOrderPrepEstimate({
    defaultPrepMinutes: business.defaultPrepMinutes,
    deliveryBufferMinutes: business.deliveryBufferMinutes,
    fulfillmentType: d.fulfillmentType,
    lineItems: d.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    productMap,
  });

  res.json(serializePrepEstimate(estimate));
});

// POST /api/orders
router.post("/orders", async (req, res): Promise<void> => {
  const idempotencyKey = req.get("Idempotency-Key")?.trim();
  if (idempotencyKey) {
    if (idempotencyKey.length > 128) {
      res.status(400).json({ error: "Idempotency-Key is too long." });
      return;
    }
    const existingOrderId = await findOrderIdByIdempotencyKey(idempotencyKey);
    if (existingOrderId) {
      const existing = await getOrderWithItems(existingOrderId);
      if (existing) {
        res.status(200).json({
          ...existing,
          accessToken: createOrderAccessToken(existingOrderId),
        });
        return;
      }
    }
  }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;

  const guestValidation = validateGuestOrderContact({
    customerName: d.customerName,
    customerEmail: d.customerEmail,
    customerPhone: d.customerPhone,
    fulfillmentType: d.fulfillmentType,
    deliveryAddress: d.deliveryAddress,
  });
  if (!guestValidation.ok) {
    res.status(400).json({ error: guestValidation.error });
    return;
  }

  const { userId: customerUserId } = getAuth(req);

  if (customerUserId) {
    const [customer] = await db
      .select({ status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, customerUserId));

    if (customer && respondIfUserDisabled(customer.status, res)) {
      return;
    }
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.businessId, d.businessId));

  const productMap = new Map(products.map((p) => [p.id, p]));
  const optionGroupsByProduct = await loadOptionGroupsByProductIds(products.map((p) => p.id));

  const orderItems: Array<{
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxable: boolean;
    options: OrderOptionSnapshot[];
  }> = [];

  for (const item of d.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const groups = optionGroupsByProduct.get(product.id) ?? [];
    const priced = validateOrderItemSelections(
      product,
      groups,
      item.quantity,
      item.selectedOptionIds,
    );
    if (!priced.ok) {
      res.status(400).json({ error: priced.error });
      return;
    }
    orderItems.push({
      productId: item.productId,
      productName: priced.productName,
      quantity: item.quantity,
      unitPrice: priced.unitPrice,
      subtotal: priced.subtotal,
      taxable: product.taxable !== false,
      options: priced.options,
    });
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, d.businessId));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  let mobileLocations: Array<{
    locationDate: string;
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
  }> | undefined;
  if (business.orderingAvailabilityMode === "MOBILE_LOCATION_SCHEDULE") {
    mobileLocations = await db
      .select({
        locationDate: foodTruckLocationsTable.locationDate,
        startTime: foodTruckLocationsTable.startTime,
        endTime: foodTruckLocationsTable.endTime,
        isActive: foodTruckLocationsTable.isActive,
      })
      .from(foodTruckLocationsTable)
      .where(eq(foodTruckLocationsTable.businessId, business.id));
  }

  const availability = evaluateBusinessOrderingAvailability(business, { mobileLocations });
  if (!availability.available) {
    res.status(400).json({
      error: availability.reason ?? BUSINESS_NOT_ACCEPTING_ORDERS_MESSAGE,
    });
    return;
  }

  const featureGate = await requireOnlineOrderingFeature(d.businessId);
  if (!featureGate.ok) {
    res.status(featureGate.status).json({ error: featureGate.error });
    return;
  }

  const paymentMethod = parseOrderPaymentMethod(d.paymentMethod);
  if (!paymentMethod) {
    res.status(400).json({ error: "Invalid payment method." });
    return;
  }
  const paymentError = validatePaymentMethodForBusiness(business, paymentMethod);
  if (paymentError) {
    res.status(400).json({ error: paymentError });
    return;
  }

  if (paymentMethod === "STRIPE") {
    const stripeError = validateOnlineCardPaymentReady(business);
    if (stripeError) {
      res.status(400).json({ error: stripeError });
      return;
    }
  }

  const deliveryFee =
    d.fulfillmentType === "DELIVERY" && business?.deliveryFee
      ? parseFloat(business.deliveryFee)
      : null;

  const orderTotals = calculateOrderTotals({
    items: orderItems.map((item) => ({
      lineSubtotalCents: dollarsToCents(item.subtotal),
      taxable: item.taxable,
    })),
    taxEnabled: business.taxEnabled === true,
    taxRatePercent: business.taxRatePercent ? parseFloat(business.taxRatePercent) : 0,
    taxLabel: business.taxLabel ?? undefined,
    deliveryFeeCents: deliveryFee ? dollarsToCents(deliveryFee) : 0,
  });

  const total = centsToDollars(orderTotals.totalCents);

  const prepEstimate = calculateOrderPrepEstimate({
    defaultPrepMinutes: business.defaultPrepMinutes,
    deliveryBufferMinutes: business.deliveryBufferMinutes,
    fulfillmentType: d.fulfillmentType,
    lineItems: d.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
    productMap,
  });

  let order;
  try {
    order = await db.transaction(async (tx) => {
    const businessOrderNumber = await allocateBusinessOrderNumber(tx, d.businessId);
    const [created] = await tx
      .insert(ordersTable)
      .values({
        businessId: d.businessId,
        orderNumber: generateOrderNumber(),
        businessOrderNumber,
        fulfillmentType: d.fulfillmentType as never,
        customerName: d.customerName.trim(),
        customerEmail: d.customerEmail.trim(),
        customerPhone: d.customerPhone?.trim() ?? null,
        customerUserId: customerUserId ?? null,
        deliveryAddress: d.deliveryAddress?.trim(),
        pickupTime: "ASAP",
        estimatedWindowStart: prepEstimate.estimatedWindowStart,
        estimatedWindowEnd: prepEstimate.estimatedWindowEnd,
        notes: d.notes,
        specialFields: d.specialFields,
        subtotalCents: orderTotals.subtotalCents,
        taxCents: orderTotals.taxCents,
        taxRatePercent:
          orderTotals.taxRatePercent != null ? String(orderTotals.taxRatePercent) : null,
        taxLabel: orderTotals.taxLabel,
        total: String(total),
        deliveryFee: deliveryFee ? String(deliveryFee) : null,
        paymentMethod,
      })
      .returning();

    const insertedItems = await tx
      .insert(orderItemsTable)
      .values(
        orderItems.map((item) => ({
          orderId: created.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          subtotal: String(item.subtotal),
        })),
      )
      .returning();

    const optionRows = insertedItems.flatMap((inserted, index) =>
      orderItems[index].options.map((opt) => ({
        orderItemId: inserted.id,
        optionId: opt.optionId,
        groupName: opt.groupName,
        optionName: opt.optionName,
        priceAdjustment: String(opt.priceAdjustment),
      })),
    );
    if (optionRows.length > 0) {
      await tx.insert(orderItemOptionsTable).values(optionRows);
    }

    if (idempotencyKey) {
      await tx.insert(orderIdempotencyKeysTable).values({
        idempotencyKey,
        orderId: created.id,
      });
    }

    return created;
    });
  } catch (err) {
    if (idempotencyKey && isPostgresUniqueViolation(err)) {
      const existingOrderId = await findOrderIdByIdempotencyKey(idempotencyKey);
      if (existingOrderId) {
        const existing = await getOrderWithItems(existingOrderId);
        if (existing) {
          res.status(200).json({
            ...existing,
            accessToken: createOrderAccessToken(existingOrderId),
          });
          return;
        }
      }
    }
    throw err;
  }

  const result = await getOrderWithItems(order.id);
  const accessToken = createOrderAccessToken(order.id);
  res.status(201).json({ ...result, accessToken });

  // ── Fire-and-forget notifications (never block the response) ──────────────
  // Pay-at-pickup: notify owner + customer immediately.
  // Stripe: wait until the payment webhook marks PAID — otherwise owners get
  // "New order" while the customer is still on Checkout (and abandoned carts notify).
  if (paymentMethod === "IN_PERSON") {
    notifyOwnerNewOrderFromOrderId(order.id).catch(() => {});
    publishOrderCreatedLiveEvent(order.businessId, order.id, order.status ?? "NEW");
    notifyCustomerOrderReceived(order.id).catch(() => {});
  }
});

// GET /api/me/orders — signed-in customer's own order history
router.get("/me/orders", requireAuth, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.customerUserId, userId))
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  const businessNameById = await loadBusinessNameMap(
    [...new Set(orders.map((order) => order.businessId))],
  );

  const ordersWithItems = await serializeOrdersBatch(
    orders,
    (order) => businessNameById.get(order.businessId) ?? "Unknown",
    { includeRefundDetails: false },
  );

  res.json(ordersWithItems);
});

// GET /api/orders/:id
router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse({ id: parseId(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    respondOrderNotFound(res);
    return;
  }

  const viewer = await loadOrderViewerContext(req, order.businessId);

  const viewAuth = authorizeOrderAccess(
    buildOrderAccessInput(order.id, order.customerUserId, {
      ...viewer,
      orderCustomerUserId: order.customerUserId,
    }),
  );

  if (!viewAuth.allowed) {
    respondOrderNotFound(res);
    return;
  }

  const result = await getOrderWithItems(params.data.id, {
    includeRefundDetails: await resolveIncludeRefundDetails(req, order.businessId),
  });
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

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const { userId } = getAuth(req);
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId!));

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  const auth = authorizeOrderStatusUpdate({
    userId: userId!,
    userRole: user.role,
    businessOwnerId: business?.ownerId,
  });

  if (!auth.allowed) {
    res.status(auth.statusCode).json({ error: auth.error });
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

  // ── Notify customer of meaningful status changes (fire-and-forget) ────────
  if (parsed.data.status !== order.status) {
    notifyCustomerOrderStatusChange(result.id, parsed.data.status).catch(() => {});
    publishOrderUpdatedLiveEvent(order.businessId, result.id, parsed.data.status);
  }
});

// POST /api/orders/:id/refund — business owner or admin issues a Stripe refund
router.post("/orders/:id/refund", requireAuth, async (req, res): Promise<void> => {
  const params = RefundOrderParams.safeParse({ id: parseId(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RefundOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const { userId } = getAuth(req);
  const [user] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId!));

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [business] = await db
    .select({ ownerId: businessesTable.ownerId })
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  const auth = authorizeOrderRefund({
    userId: userId!,
    userRole: user.role,
    businessOwnerId: business?.ownerId,
  });

  if (!auth.allowed) {
    res.status(auth.statusCode).json({ error: auth.error });
    return;
  }

  const result = await createOrderRefund({
    orderId: order.id,
    amountCents: parsed.data.amountCents,
    reason: parsed.data.reason,
    createdByUserId: userId!,
  });

  if (!result.ok) {
    if (result.statusCode >= 500) {
      notifyOwnerRefundFailed(order.id, parsed.data.amountCents).catch(() => {});
    }
    res.status(result.statusCode).json({ error: result.error });
    return;
  }

  const serializedOrder = await getOrderWithItems(order.id, { includeRefundDetails: true });
  const serializedRefunds = await serializeOrderRefunds([result.refund]);
  const refundRecord = serializedRefunds[0];

  if (!serializedOrder || !refundRecord) {
    res.status(500).json({ error: "Refund processed but failed to load updated order." });
    return;
  }

  res.json({ order: serializedOrder, refund: refundRecord });

  if (result.refund.status === "SUCCEEDED") {
    notifyCustomerOrderRefund(order.id, result.refund.amountCents).catch(() => {});
    publishOrderRefundedLiveEvent(order.businessId, order.id, "REFUNDED");
  }
});

// GET /api/businesses/:businessId/orders
router.get(
  "/businesses/:businessId/orders",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseId(req.params.businessId);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const params = ListBusinessOrdersParams.safeParse({ businessId });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const listQuery = parseBusinessOrderListQuery(
      req.query as Record<string, string | undefined>,
    );

    const conditions = [eq(ordersTable.businessId, params.data.businessId)];
    if (listQuery.status) {
      conditions.push(eq(ordersTable.status, listQuery.status as never));
    }
    if (listQuery.activeOnly) {
      conditions.push(
        inArray(ordersTable.status, [...ACTIVE_KITCHEN_ORDER_STATUSES] as never),
      );
    }
    if (listQuery.since) {
      conditions.push(gte(ordersTable.createdAt, listQuery.since));
    }

    const orders = await db
      .select()
      .from(ordersTable)
      .where(and(...conditions))
      .orderBy(sql`${ordersTable.createdAt} DESC`);

    const [business] = await db
      .select({ name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, params.data.businessId));

    const businessName = business?.name ?? "Unknown";
    const ordersWithItems = await serializeOrdersBatch(
      orders,
      () => businessName,
      { includeRefundDetails: true },
    );

    res.set("Cache-Control", "no-store");
    res.json(ordersWithItems);
  },
);

// GET /api/businesses/:businessId/orders/summary
router.get(
  "/businesses/:businessId/orders/summary",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseId(req.params.businessId);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    const params = GetBusinessOrderSummaryParams.safeParse({ businessId });
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [business] = await db
      .select({ name: businessesTable.name })
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId));

    const summary = await loadBusinessOrderSummary(
      businessId,
      business?.name ?? "Unknown",
    );

    res.set("Cache-Control", "no-store");
    res.json(summary);
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

  const businesses = await db
    .select({ id: businessesTable.id, name: businessesTable.name })
    .from(businessesTable);
  const bizMap = new Map(businesses.map((b) => [b.id, b.name]));

  const ordersWithItems = await serializeOrdersBatch(
    orders,
    (order) => bizMap.get(order.businessId) ?? "Unknown",
    { includeRefundDetails: false },
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

  const [orderRow] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, parsed.data.orderId));

  if (!orderRow) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const accessToken =
    parsed.data.accessToken?.trim() || extractOrderAccessToken(req) || null;

  const viewer = await loadOrderViewerContext(req, order.businessId);
  const checkoutAuth = authorizeOrderAccess(
    buildOrderAccessInput(orderRow.id, orderRow.customerUserId, {
      ...viewer,
      orderCustomerUserId: orderRow.customerUserId,
      accessToken,
    }),
  );

  if (!checkoutAuth.allowed) {
    respondOrderNotFound(res);
    return;
  }

  if (orderRow.paymentStatus === "PAID") {
    res.status(400).json({ error: "This order has already been paid." });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.id, order.businessId));

  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }

  const paymentError = validatePaymentMethodForBusiness(business, order.paymentMethod ?? "STRIPE");
  if (paymentError) {
    res.status(400).json({ error: paymentError });
    return;
  }

  if (order.paymentMethod === "IN_PERSON") {
    res.status(400).json({ error: "Online checkout is not available for pay-at-pickup orders." });
    return;
  }

  const stripeError = validateOnlineCardPaymentReady(business);
  if (stripeError) {
    res.status(400).json({ error: stripeError });
    return;
  }

  if (!business.stripeConnectedAccountId) {
    res.status(400).json({ error: "This business has not connected Stripe for online card payments." });
    return;
  }

  if (isMockMode && !isMockCheckoutAllowed()) {
    res.status(503).json({ error: "Online card payments are not available right now." });
    return;
  }

  if (
    orderRow.stripeSessionId &&
    business.stripeConnectedAccountId &&
    !isMockMode
  ) {
    const existingSession = await retrieveOpenStripeCheckoutSession(
      orderRow.stripeSessionId,
      business.stripeConnectedAccountId,
    );
    if (existingSession) {
      res.json({ url: existingSession.url, sessionId: existingSession.sessionId, mockMode: false });
      return;
    }
  }

  const baseUrl = getAppBaseUrl();
  const orderToken = createOrderAccessToken(order.id);

  const result = await createStripeCheckoutSession(
    order.id,
    order.orderNumber,
    buildStripeCheckoutLineItems({
      items: order.items.map((i) => ({
        productName: i.productName,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
      deliveryFee: order.deliveryFee,
      tax: order.tax,
      taxLabel: order.taxLabel,
    }),
    business.stripeConnectedAccountId,
    `${baseUrl}/order/${order.id}?payment=success&token=${encodeURIComponent(orderToken)}`,
    `${baseUrl}/cart?payment=canceled`,
  );

  if (result.sessionId) {
    await db
      .update(ordersTable)
      .set({
        stripeSessionId: result.sessionId,
        stripeConnectedAccountId: business.stripeConnectedAccountId,
      })
      .where(eq(ordersTable.id, order.id));
  }

  res.json(result);
});

// POST /api/checkout/webhook (Stripe webhook)
router.post("/checkout/webhook", async (req, res): Promise<void> => {
  const verification = verifyStripeWebhookSignature({
    rawBody: req.body,
    signatureHeader: req.headers["stripe-signature"],
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripeClient: stripe,
  });

  if (!verification.ok) {
    logOperationalFailure("stripe_webhook_failed", { reason: verification.reason });
    res.status(verification.status).json({ error: verification.error });
    return;
  }

  const event = verification.event;

  try {
    const { handled, result } = await handleStripeWebhookEvent(event);

    if (handled) {
      recordStripeWebhookReceived(event.type);
    }

    if (handled && result && !result.ok) {
      req.log.warn(
        { eventId: event.id, eventType: event.type, reason: result.reason, orderId: result.orderId },
        "Stripe webhook event rejected",
      );
    }

    if (handled && result?.ok && !result.alreadyPaid) {
      req.log.info(
        { eventId: event.id, orderId: result.orderId },
        "Order marked paid via Stripe webhook",
      );
    }
  } catch (err) {
    logOperationalFailure("stripe_webhook_failed", { reason: "processing_error" });
    req.log.error({ err, eventId: event.id }, "Stripe webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
    return;
  }

  res.json({ received: true });
});

export default router;
