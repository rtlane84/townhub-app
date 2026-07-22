import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile } from "node:fs/promises";

const schemaDir = new URL("../../../../lib/db/src/schema/", import.meta.url);
const dbDir = new URL("../../../../lib/db/src/", import.meta.url);
const routesDir = new URL("../routes/", import.meta.url);

describe("database performance indexes", () => {
  it("defines hot-path indexes on orders and related tables", async () => {
    const orders = await readFile(new URL("orders.ts", schemaDir), "utf8");
    const refunds = await readFile(new URL("order-refunds.ts", schemaDir), "utf8");

    assert.match(orders, /orders_business_status_created_at_idx/);
    assert.match(orders, /orders_business_created_at_idx/);
    assert.match(orders, /orders_customer_user_created_at_idx/);
    assert.match(orders, /order_items_order_id_idx/);
    assert.match(orders, /order_item_options_order_item_id_idx/);
    assert.match(refunds, /order_refunds_order_id_idx/);
    assert.match(refunds, /order_refunds_stripe_refund_id_idx/);
  });

  it("defines indexes for businesses, products, and food trucks", async () => {
    const businesses = await readFile(new URL("businesses.ts", schemaDir), "utf8");
    const products = await readFile(new URL("products.ts", schemaDir), "utf8");

    assert.match(businesses, /businesses_owner_id_idx/);
    assert.match(businesses, /businesses_active_archived_at_idx/);
    assert.match(businesses, /food_truck_locations_business_date_idx/);
    assert.match(businesses, /food_truck_locations_date_active_idx/);
    assert.match(products, /products_business_available_category_idx/);
    assert.match(products, /categories_business_sort_order_idx/);
  });

  it("defines indexes for appointments, media, notifications, applications, subscriptions", async () => {
    const appointments = await readFile(
      new URL("appointment-requests.ts", schemaDir),
      "utf8",
    );
    const media = await readFile(new URL("media.ts", schemaDir), "utf8");
    const notifications = await readFile(new URL("notifications.ts", schemaDir), "utf8");
    const applications = await readFile(new URL("applications.ts", schemaDir), "utf8");
    const subscriptions = await readFile(new URL("subscriptions.ts", schemaDir), "utf8");

    assert.match(appointments, /appointment_requests_business_created_at_idx/);
    assert.match(media, /media_assets_business_created_at_idx/);
    assert.match(notifications, /notification_logs_created_at_idx/);
    assert.match(applications, /business_applications_user_status_idx/);
    assert.match(subscriptions, /business_subscriptions_stripe_subscription_id_idx/);
  });
});

describe("database pool configuration", () => {
  it("reads pool settings from env with safe defaults", async () => {
    const { resolveDatabasePoolConfig } = await import(
      new URL("../../../../lib/db/src/pool-config.ts", import.meta.url).href
    );

    assert.deepEqual(resolveDatabasePoolConfig({}), {
      max: 10,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      queryTimeoutMs: 30_000,
    });

    assert.deepEqual(
      resolveDatabasePoolConfig({
        DATABASE_POOL_MAX: "25",
        DATABASE_CONNECTION_TIMEOUT_MS: "5000",
        DATABASE_IDLE_TIMEOUT_MS: "60000",
        DATABASE_QUERY_TIMEOUT_MS: "0",
      }),
      {
        max: 25,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 60_000,
        queryTimeoutMs: 0,
      },
    );
  });

  it("wires pool env vars and error logging in db entrypoint", async () => {
    const source = await readFile(new URL("index.ts", dbDir), "utf8");
    assert.match(source, /resolveDatabasePoolConfig/);
    assert.match(source, /pool\.on\("error"/);
    assert.match(source, /statement_timeout/);
  });

  it("silences successful /health access logs to protect Railway log rate limits", async () => {
    const source = await readFile(new URL("../app.ts", routesDir), "utf8");
    assert.match(source, /autoLogging/);
    assert.match(source, /url === "\/health"/);
  });

  it("aggregates platform overview stats in SQL instead of loading full tables", async () => {
    const source = await readFile(new URL("businesses.ts", routesDir), "utf8");
    const statsRoute = source.slice(
      source.indexOf('router.get("/businesses/stats"'),
      source.indexOf('// GET /api/businesses/checkout'),
    );

    assert.match(statsRoute, /count\(\)/);
    assert.match(statsRoute, /sum\(ordersTable\.total\)/);
    assert.doesNotMatch(statsRoute, /db\.select\(\)\.from\((businesses|orders)Table\)/);
  });

  it("keeps the public directory query small, parallel, and briefly cached", async () => {
    const source = await readFile(new URL("businesses.ts", routesDir), "utf8");
    const directoryRoute = source.slice(
      source.indexOf('router.get("/businesses"'),
      source.indexOf('// POST /api/businesses/register'),
    );

    assert.match(directoryRoute, /select\(publicBusinessColumns\)/);
    assert.match(directoryRoute, /Promise\.all/);
    assert.match(directoryRoute, /getPublicBusinessDirectoryCache/);
    assert.match(directoryRoute, /setPublicBusinessDirectoryCache/);
    assert.match(directoryRoute, /const cacheKey = search \? null/);
    assert.doesNotMatch(directoryRoute, /\.select\(\)\s*\.from\(businessesTable\)/);
  });
});
