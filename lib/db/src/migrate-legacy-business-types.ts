import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { businessesTable } from "./schema/businesses";

/**
 * One-time data backfill for the former FOOD_TRUCK and CAFE_BAKERY identities.
 * Run only after the Drizzle schema has been reviewed and applied.
 */
export async function migrateLegacyBusinessTypes(): Promise<{
  foodTrucks: number;
  cafeBakeries: number;
  mobileFlagBackfills: number;
  eventLocationFlagBackfills: number;
}> {
  const foodTrucks = await db
    .update(businessesTable)
    .set({
      type: "FOOD_VENDOR",
      isMobileBusiness: true,
      eventLocationEnabled: true,
    })
    .where(eq(businessesTable.type, "FOOD_TRUCK"))
    .returning({ id: businessesTable.id });

  const cafeBakeries = await db
    .update(businessesTable)
    .set({ type: "COFFEE_SHOP" })
    .where(eq(businessesTable.type, "CAFE_BAKERY"))
    .returning({ id: businessesTable.id });

  const mobileFlagBackfills = await db
    .execute(sql`
      UPDATE businesses
      SET
        is_mobile_business = true,
        event_location_enabled = true
      WHERE COALESCE(event_location_enabled, false) = true
        AND is_mobile_business = false
      RETURNING id
    `);

  const eventLocationFlagBackfills = await db.execute(sql`
    UPDATE businesses
    SET event_location_enabled = true
    WHERE is_mobile_business = true
      AND COALESCE(event_location_enabled, false) = false
  `);

  return {
    foodTrucks: foodTrucks.length,
    cafeBakeries: cafeBakeries.length,
    mobileFlagBackfills: mobileFlagBackfills.rows.length,
    eventLocationFlagBackfills: eventLocationFlagBackfills.rows.length,
  };
}
