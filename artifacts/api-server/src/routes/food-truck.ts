import { Router, type IRouter } from "express";
import { db, foodTruckLocationsTable, businessesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { z } from "zod";

const router: IRouter = Router();

const locationInputSchema = z.object({
  locationName: z.string().min(1),
  address: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  locationDate: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  locationNotes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

function serializeLocation(loc: typeof foodTruckLocationsTable.$inferSelect) {
  return {
    id: loc.id,
    businessId: loc.businessId,
    locationName: loc.locationName,
    address: loc.address,
    latitude: loc.latitude,
    longitude: loc.longitude,
    locationDate: loc.locationDate,
    startTime: loc.startTime,
    endTime: loc.endTime,
    locationNotes: loc.locationNotes,
    isActive: loc.isActive,
  };
}

// GET /api/businesses/:id/food-truck-locations
router.get("/businesses/:id/food-truck-locations", async (req, res): Promise<void> => {
  const businessId = parseInt(req.params.id, 10);
  const locs = await db
    .select()
    .from(foodTruckLocationsTable)
    .where(eq(foodTruckLocationsTable.businessId, businessId))
    .orderBy(foodTruckLocationsTable.locationDate);
  res.json(locs.map(serializeLocation));
});

// POST /api/businesses/:id/food-truck-locations
router.post("/businesses/:id/food-truck-locations", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const businessId = parseInt(req.params.id, 10);
  const parsed = locationInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [loc] = await db.insert(foodTruckLocationsTable).values({ ...parsed.data, businessId }).returning();
  res.status(201).json(serializeLocation(loc));
});

// PUT /api/businesses/:id/food-truck-locations/:locationId
router.put("/businesses/:id/food-truck-locations/:locationId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const locationId = parseInt(req.params.locationId, 10);
  const parsed = locationInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(foodTruckLocationsTable).set(parsed.data).where(eq(foodTruckLocationsTable.id, locationId)).returning();
  if (!updated) { res.status(404).json({ error: "Location not found" }); return; }
  res.json(serializeLocation(updated));
});

// DELETE /api/businesses/:id/food-truck-locations/:locationId
router.delete("/businesses/:id/food-truck-locations/:locationId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const locationId = parseInt(req.params.locationId, 10);
  await db.delete(foodTruckLocationsTable).where(eq(foodTruckLocationsTable.id, locationId));
  res.status(204).send();
});

// GET /api/food-truck-locations/today (public)
router.get("/food-truck-locations/today", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select({
      id: foodTruckLocationsTable.id,
      businessId: foodTruckLocationsTable.businessId,
      locationName: foodTruckLocationsTable.locationName,
      address: foodTruckLocationsTable.address,
      latitude: foodTruckLocationsTable.latitude,
      longitude: foodTruckLocationsTable.longitude,
      locationDate: foodTruckLocationsTable.locationDate,
      startTime: foodTruckLocationsTable.startTime,
      endTime: foodTruckLocationsTable.endTime,
      locationNotes: foodTruckLocationsTable.locationNotes,
      isActive: foodTruckLocationsTable.isActive,
      businessName: businessesTable.name,
      businessSlug: businessesTable.slug,
      businessLogoUrl: businessesTable.logoUrl,
    })
    .from(foodTruckLocationsTable)
    .innerJoin(businessesTable, eq(foodTruckLocationsTable.businessId, businessesTable.id))
    .where(
      and(
        eq(foodTruckLocationsTable.locationDate, today),
        eq(foodTruckLocationsTable.isActive, true),
        eq(businessesTable.active, true),
      ),
    )
    .orderBy(foodTruckLocationsTable.startTime);

  res.json(rows);
});

export default router;
