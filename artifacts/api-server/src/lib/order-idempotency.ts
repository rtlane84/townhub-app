import { db, orderIdempotencyKeysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isPostgresUniqueViolation } from "./business-slug";

export async function findOrderIdByIdempotencyKey(
  idempotencyKey: string,
): Promise<number | null> {
  const [row] = await db
    .select({ orderId: orderIdempotencyKeysTable.orderId })
    .from(orderIdempotencyKeysTable)
    .where(eq(orderIdempotencyKeysTable.idempotencyKey, idempotencyKey));
  return row?.orderId ?? null;
}

export async function storeOrderIdempotencyKey(
  idempotencyKey: string,
  orderId: number,
): Promise<void> {
  try {
    await db.insert(orderIdempotencyKeysTable).values({ idempotencyKey, orderId });
  } catch (err) {
    if (!isPostgresUniqueViolation(err)) {
      throw err;
    }
  }
}
