import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

/** Ensure pending_checkouts exists (drizzle push is primary; bootstrap for deploys). */
export async function ensurePendingCheckoutsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_checkouts (
      id serial PRIMARY KEY,
      business_id integer NOT NULL,
      status text NOT NULL DEFAULT 'OPEN',
      fulfillment_type text NOT NULL,
      customer_name text NOT NULL,
      customer_email text NOT NULL,
      customer_phone text,
      customer_user_id text,
      delivery_address text,
      notes text,
      special_fields text,
      items_json jsonb NOT NULL,
      subtotal_cents integer NOT NULL,
      tax_cents integer NOT NULL DEFAULT 0,
      tax_rate_percent numeric(5, 2),
      tax_label text,
      delivery_fee numeric(10, 2),
      total numeric(10, 2) NOT NULL,
      estimated_window_start timestamptz,
      estimated_window_end timestamptz,
      stripe_session_id text,
      stripe_connected_account_id text,
      order_id integer,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pending_checkouts_stripe_session_uidx
    ON pending_checkouts (stripe_session_id)
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pending_checkouts_order_id_uidx
    ON pending_checkouts (order_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS pending_checkouts_business_status_idx
    ON pending_checkouts (business_id, status)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS pending_checkouts_expires_at_idx
    ON pending_checkouts (expires_at)
  `);

  // Idempotency for materialize-from-session (legacy + new paid orders).
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_uidx
    ON orders (stripe_session_id)
    WHERE stripe_session_id IS NOT NULL
  `);

  logger.info("Ensured pending_checkouts table and orders.stripe_session_id unique index");
}
