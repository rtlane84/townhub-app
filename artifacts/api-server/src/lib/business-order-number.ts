import { sql } from "drizzle-orm";

type ExecuteResult = {
  rows?: Array<Record<string, unknown>>;
};

type Tx = {
  execute: (query: ReturnType<typeof sql>) => Promise<ExecuteResult>;
};

function rowsFromExecute(result: ExecuteResult): Array<Record<string, unknown>> {
  if (result && Array.isArray(result.rows)) return result.rows;
  return [];
}

/**
 * Atomically allocate the next per-business sequential order number.
 * Starts at 101 for new businesses (schema default).
 */
export async function allocateBusinessOrderNumber(
  tx: Tx,
  businessId: number,
): Promise<number> {
  const result = await tx.execute(sql`
    UPDATE businesses
    SET next_business_order_number = next_business_order_number + 1
    WHERE id = ${businessId}
    RETURNING next_business_order_number - 1 AS business_order_number
  `);

  const allocated = rowsFromExecute(result)[0]?.business_order_number;
  if (allocated == null || !Number.isFinite(Number(allocated))) {
    throw new Error(`Failed to allocate business order number for business ${businessId}`);
  }
  return Number(allocated);
}

/** Schema default used when creating businesses. */
export const INITIAL_BUSINESS_ORDER_NUMBER = 101;
