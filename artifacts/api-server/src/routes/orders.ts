import { Router, type IRouter } from "express";
import { respondOrderNotFound } from "../lib/order-not-found-response";
import {
  db,
  ordersTable,
  orderItemsTable,
  orderItemOptionsTable,
  orderIdempotencyKeysTable,
  pendingCheckoutsTable,
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
import { createStripeCheckoutSession, stripe, isMockMode, retrieveStripeCheckoutSession } from "../lib/stripe";
import { logOperationalFailure } from "../lib/operational-log";
import { respondIfUserDisabled } from "../lib/user-account-status";
import { recordStripeWebhookReceived } from "../lib/system-runtime-state";
import {
  handleStripeWebhookEvent,
  markOrderPaidFromCheckoutSession,
  verifyStripeWebhookSignature,
} from "../lib/stripe-webhook";
import { validatePaymentMethodForBusiness, parseOrderPaymentMethod } from "../lib/payment-mode";
import { validateOnlineCardPaymentReady } from "../lib/stripe-connect";
import { getAppBaseUrl } from "../lib/app-base-url";
import { isMockCheckoutAllowed } from "../lib/stripe-config";
import { requireAuth } from "../middlewares/requireRole";
import {
  notifyOwnerNewOrderFromOrderId,
  notifyCustomerOrderReceived,
  notifyCustomerOrderStatusChange,
  notifyOwnerRefundFailed,
  notifyCustomerOrderRefund,
} from "../lib/notifications";
import {
  publishOrderCreatedLiveEvent,
  publishOrderUpdatedLiveEvent,
  publishOrderRefundedLiveEvent,
} from "../lib/business-live-events";
import {
  createOrderAccessToken,
  createPendingCheckoutAccessToken,
  verifyPendingCheckoutAccessToken,
} from "../lib/order-access-token";
import { materializePaidOrderFromPendingCheckout } from "../lib/pending-checkout-materialize";
import { authorizeOrderStatusUpdate } from "../lib/order-access";
import { validateGuestOrderContact } from "../lib/guest-checkout";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  createOrderRefund,
  serializeOrderRefunds,
  authorizeOrderRefund,
} from "../lib/order-refund";
import {
  loadOptionGroupsByProductIds,
  validateOrderItemSelections,
  type OrderOptionSnapshot,
} from "../lib/product-options";
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
import { assertProductAvailableForOrder } from "../lib/product-availability";
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
import { getPlatformTimeZone } from "../lib/platform-timezone";

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
    const availabilityCheck = assertProductAvailableForOrder(product);
    if (!availabilityCheck.ok) {
      res.status(400).json({
        error: availabilityCheck.error,
        code: availabilityCheck.code,
      });
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

  const availability = evaluateBusinessOrderingAvailability(business, {
    mobileLocations,
    timeZone: await getPlatformTimeZone(),
  });
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
  if (paymentMethod === "STRIPE") {
    res.status(400).json({
      error:
        "Card checkout no longer creates an order up front. Use POST /api/checkout/intents instead.",
    });
    return;
  }
  const paymentError = validatePaymentMethodForBusiness(business, paymentMethod);
  if (paymentError) {
    res.status(400).json({ error: paymentError });
    return;
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
        paymentStatus: "PENDING",
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
  // Pay-at-pickup only — card orders are created after Stripe confirms payment.
  notifyOwnerNewOrderFromOrderId(order.id).catch(() => {});
  publishOrderCreatedLiveEvent(order.businessId, order.id, order.status ?? "NEW");
  notifyCustomerOrderReceived(order.id).catch(() => {});
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
    // Never surface unpaid card checkouts (legacy rows) — owners only see actionable orders.
    conditions.push(
      sql`(coalesce(${ordersTable.paymentMethod}, 'STRIPE') <> 'STRIPE' OR ${ordersTable.paymentStatus} = 'PAID')`,
    );
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

// POST /api/checkout/intents — create pending checkout + Stripe session (no order yet)
router.post("/checkout/intents", async (req, res): Promise<void> => {
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
    const availabilityCheck = assertProductAvailableForOrder(product);
    if (!availabilityCheck.ok) {
      res.status(400).json({
        error: availabilityCheck.error,
        code: availabilityCheck.code,
      });
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

  let mobileLocations:
    | Array<{
        locationDate: string;
        startTime: string | null;
        endTime: string | null;
        isActive: boolean;
      }>
    | undefined;
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

  const availability = evaluateBusinessOrderingAvailability(business, {
    mobileLocations,
    timeZone: await getPlatformTimeZone(),
  });
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

  const paymentError = validatePaymentMethodForBusiness(business, "STRIPE");
  if (paymentError) {
    res.status(400).json({ error: paymentError });
    return;
  }

  const stripeError = validateOnlineCardPaymentReady(business);
  if (stripeError) {
    res.status(400).json({ error: stripeError });
    return;
  }

  if (!business.stripeConnectedAccountId) {
    res.status(400).json({
      error: "This business has not connected Stripe for online card payments.",
    });
    return;
  }

  if (isMockMode && !isMockCheckoutAllowed()) {
    res.status(503).json({ error: "Online card payments are not available right now." });
    return;
  }

  const deliveryFee =
    d.fulfillmentType === "DELIVERY" && business.deliveryFee
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

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [pending] = await db
    .insert(pendingCheckoutsTable)
    .values({
      businessId: d.businessId,
      status: "OPEN",
      fulfillmentType: d.fulfillmentType,
      customerName: d.customerName.trim(),
      customerEmail: d.customerEmail.trim(),
      customerPhone: d.customerPhone?.trim() ?? null,
      customerUserId: customerUserId ?? null,
      deliveryAddress: d.deliveryAddress?.trim(),
      notes: d.notes,
      specialFields: d.specialFields,
      itemsJson: orderItems,
      subtotalCents: orderTotals.subtotalCents,
      taxCents: orderTotals.taxCents,
      taxRatePercent:
        orderTotals.taxRatePercent != null ? String(orderTotals.taxRatePercent) : null,
      taxLabel: orderTotals.taxLabel,
      deliveryFee: deliveryFee ? String(deliveryFee) : null,
      total: String(total),
      estimatedWindowStart: prepEstimate.estimatedWindowStart,
      estimatedWindowEnd: prepEstimate.estimatedWindowEnd,
      stripeConnectedAccountId: business.stripeConnectedAccountId,
      expiresAt,
    })
    .returning();

  const accessToken = createPendingCheckoutAccessToken(pending.id);
  const baseUrl = getAppBaseUrl();
  const successUrl =
    `${baseUrl}/native-checkout-return/?pendingCheckoutId=${pending.id}` +
    `&payment=success&token=${encodeURIComponent(accessToken)}`;
  const cancelUrl = `${baseUrl}/native-checkout-return/?payment=canceled`;

  const lineItems = buildStripeCheckoutLineItems({
    items: orderItems.map((i) => ({
      productName: i.productName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
    })),
    deliveryFee,
    tax: centsToDollars(orderTotals.taxCents),
    taxLabel: orderTotals.taxLabel,
  });

  const result = await createStripeCheckoutSession({
    lineItems,
    connectedAccountId: business.stripeConnectedAccountId,
    successUrl,
    cancelUrl,
    metadata: {
      pendingCheckoutId: String(pending.id),
      connectedAccountId: business.stripeConnectedAccountId,
    },
  });

  if (result.sessionId) {
    await db
      .update(pendingCheckoutsTable)
      .set({ stripeSessionId: result.sessionId })
      .where(eq(pendingCheckoutsTable.id, pending.id));
  }

  // Mock mode: no Stripe session — materialize immediately so local/dev still works.
  if (result.mockMode) {
    const mockSessionId = `cs_mock_${pending.id}`;
    const mockSession = {
      id: mockSessionId,
      payment_status: "paid" as const,
      amount_total: dollarsToCents(total),
      metadata: {
        pendingCheckoutId: String(pending.id),
        connectedAccountId: business.stripeConnectedAccountId,
      },
      payment_intent: null,
    };

    await db
      .update(pendingCheckoutsTable)
      .set({ stripeSessionId: mockSessionId })
      .where(eq(pendingCheckoutsTable.id, pending.id));

    const [fresh] = await db
      .select()
      .from(pendingCheckoutsTable)
      .where(eq(pendingCheckoutsTable.id, pending.id));

    const materialized = await materializePaidOrderFromPendingCheckout({
      pending: fresh!,
      session: mockSession as never,
      eventAccount: business.stripeConnectedAccountId,
    });

    if (materialized.ok) {
      notifyOwnerNewOrderFromOrderId(materialized.orderId).catch(() => {});
      publishOrderCreatedLiveEvent(d.businessId, materialized.orderId, "NEW");
      notifyCustomerOrderReceived(materialized.orderId).catch(() => {});
      res.json({
        url: null,
        sessionId: mockSessionId,
        mockMode: true,
        pendingCheckoutId: pending.id,
        accessToken,
        orderId: materialized.orderId,
        orderAccessToken: createOrderAccessToken(materialized.orderId),
      });
      return;
    }
  }

  res.status(201).json({
    url: result.url,
    sessionId: result.sessionId,
    mockMode: result.mockMode,
    pendingCheckoutId: pending.id,
    accessToken,
  });
});

/** @deprecated Card checkout uses POST /checkout/intents — orders are created after payment. */
router.post("/checkout/session", async (_req, res): Promise<void> => {
  res.status(400).json({
    error:
      "Card checkout no longer uses an order id up front. Use POST /api/checkout/intents.",
  });
});

/**
 * POST /api/checkout/confirm
 * Body: { pendingCheckoutId?, orderId?, accessToken? }
 * Materializes / marks PAID from Stripe (idempotent webhook safety net).
 * Prefer pendingCheckoutId (new flow). orderId supports legacy pre-payment orders.
 */
router.post("/checkout/confirm", async (req, res): Promise<void> => {
  const body = req.body as {
    pendingCheckoutId?: unknown;
    orderId?: unknown;
    accessToken?: unknown;
  };
  const pendingCheckoutId = Number(body.pendingCheckoutId);
  const legacyOrderId = Number(body.orderId);
  const accessToken =
    typeof body.accessToken === "string"
      ? body.accessToken.trim()
      : extractOrderAccessToken(req);

  const hasPending =
    Number.isFinite(pendingCheckoutId) && pendingCheckoutId > 0;
  const hasLegacyOrder = Number.isFinite(legacyOrderId) && legacyOrderId > 0;

  if (!hasPending && !hasLegacyOrder) {
    res.status(400).json({ error: "pendingCheckoutId or orderId is required." });
    return;
  }

  if (hasPending) {
    const [pending] = await db
      .select()
      .from(pendingCheckoutsTable)
      .where(eq(pendingCheckoutsTable.id, pendingCheckoutId));

    if (!pending) {
      respondOrderNotFound(res);
      return;
    }

    const tokenOk = verifyPendingCheckoutAccessToken(pending.id, accessToken);
    const { userId } = getAuth(req);
    const linkedCustomer =
      Boolean(userId) &&
      Boolean(pending.customerUserId) &&
      userId === pending.customerUserId;

    if (!tokenOk && !linkedCustomer) {
      respondOrderNotFound(res);
      return;
    }

    if (pending.orderId) {
      const paid = await getOrderWithItems(pending.orderId);
      res.json({
        ...paid,
        accessToken: createOrderAccessToken(pending.orderId),
        pendingCheckoutId: pending.id,
      });
      return;
    }

    const connectedAccountId = pending.stripeConnectedAccountId;
    if (!pending.stripeSessionId || !connectedAccountId) {
      res.status(409).json({ error: "Checkout session is not ready to confirm yet." });
      return;
    }

    if (isMockMode) {
      res.status(409).json({ error: "Payment confirmation requires Stripe to be configured." });
      return;
    }

    const session = await retrieveStripeCheckoutSession(
      pending.stripeSessionId,
      connectedAccountId,
    );

    if (!session) {
      res.status(409).json({ error: "Could not retrieve the Stripe checkout session." });
      return;
    }

    const result = await markOrderPaidFromCheckoutSession(session, connectedAccountId);
    if (!result.ok) {
      if (result.reason === "session_not_paid") {
        res.status(409).json({ error: "Payment is not complete yet.", reason: result.reason });
        return;
      }
      logOperationalFailure("stripe_checkout_confirm_failed", {
        reason: result.reason,
        orderId: result.orderId,
      });
      res.status(409).json({ error: "Payment could not be confirmed yet.", reason: result.reason });
      return;
    }

    const updated = await getOrderWithItems(result.orderId);
    res.json({
      ...updated,
      accessToken: createOrderAccessToken(result.orderId),
      pendingCheckoutId: pending.id,
    });
    return;
  }

  // Legacy: order was created before payment (pre-pending-checkout flow).
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, legacyOrderId));

  if (!order) {
    respondOrderNotFound(res);
    return;
  }

  const viewer = await loadOrderViewerContext(req, order.businessId);
  const viewAuth = authorizeOrderAccess(
    buildOrderAccessInput(order.id, order.customerUserId, {
      ...viewer,
      accessToken: accessToken || viewer.accessToken,
      orderCustomerUserId: order.customerUserId,
    }),
  );

  if (!viewAuth.allowed) {
    respondOrderNotFound(res);
    return;
  }

  if (order.paymentStatus === "PAID") {
    const paid = await getOrderWithItems(order.id);
    res.json({ ...paid, accessToken: createOrderAccessToken(order.id) });
    return;
  }

  if (order.paymentMethod !== "STRIPE") {
    res.status(409).json({ error: "Order is not a card checkout." });
    return;
  }

  const connectedAccountId = order.stripeConnectedAccountId;
  if (!order.stripeSessionId || !connectedAccountId) {
    res.status(409).json({ error: "Checkout session is not ready to confirm yet." });
    return;
  }

  if (isMockMode) {
    res.status(409).json({ error: "Payment confirmation requires Stripe to be configured." });
    return;
  }

  const session = await retrieveStripeCheckoutSession(
    order.stripeSessionId,
    connectedAccountId,
  );

  if (!session) {
    res.status(409).json({ error: "Could not retrieve the Stripe checkout session." });
    return;
  }

  const result = await markOrderPaidFromCheckoutSession(session, connectedAccountId);
  if (!result.ok) {
    if (result.reason === "session_not_paid") {
      res.status(409).json({ error: "Payment is not complete yet.", reason: result.reason });
      return;
    }
    logOperationalFailure("stripe_checkout_confirm_failed", {
      reason: result.reason,
      orderId: result.orderId,
    });
    res.status(409).json({ error: "Payment could not be confirmed yet.", reason: result.reason });
    return;
  }

  const updated = await getOrderWithItems(result.orderId);
  res.json({
    ...updated,
    accessToken: createOrderAccessToken(result.orderId),
  });
});

// POST /api/checkout/webhook (Stripe webhook)
router.post("/checkout/webhook", async (req, res): Promise<void> => {
  const verification = verifyStripeWebhookSignature({
    rawBody: req.body,
    signatureHeader: req.headers["stripe-signature"],
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
