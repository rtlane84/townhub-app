import { Router, type IRouter, type Response } from "express";
import { getAuth } from "@clerk/express";
import { db, foodTruckLocationsTable, businessesTable } from "@workspace/db";
import { eq, and, lte, gt } from "drizzle-orm";
import { parseLocationCreateInput, parseLocationUpdateInput } from "../lib/food-truck-location";
import {
  enrichLocationInputWithGeocode,
  enrichLocationUpdateWithGeocode,
  getPlatformTownHint,
  resolvePublicLocationCoordinates,
} from "../lib/food-truck-geocode";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import { authorizeFoodTruckLocationMutation } from "../lib/food-truck-mutation-auth";
import { getPlatformTimeZone } from "../lib/platform-timezone";
import { addCivilDays, formatCivilDateInTimeZone } from "@workspace/api-zod";

const router: IRouter = Router();

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

function parseBusinessId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseLocationId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function respondMutationDenied(
  res: Response,
  result: Extract<ReturnType<typeof authorizeFoodTruckLocationMutation>, { ok: false }>,
): void {
  res.status(result.status).json({ error: result.error });
}

// GET /api/businesses/:id/food-truck-locations
router.get("/businesses/:id/food-truck-locations", async (req, res): Promise<void> => {
  const businessId = parseBusinessId(req.params.id);
  if (!businessId) {
    res.status(400).json({ error: "Invalid business id" });
    return;
  }

  const locs = await db
    .select()
    .from(foodTruckLocationsTable)
    .where(eq(foodTruckLocationsTable.businessId, businessId))
    .orderBy(foodTruckLocationsTable.locationDate);
  res.json(locs.map(serializeLocation));
});

// POST /api/businesses/:id/food-truck-locations
router.post("/businesses/:id/food-truck-locations", async (req, res): Promise<void> => {
  const businessId = parseBusinessId(req.params.id);
  if (!businessId) {
    res.status(400).json({ error: "Invalid business id" });
    return;
  }

  const businessAccess = await authorizeBusinessOwnerOrAdmin(req, businessId);
  const auth = authorizeFoodTruckLocationMutation({
    isAuthenticated: !!getAuth(req).userId,
    businessAccess,
    requestedBusinessId: businessId,
  });
  if (!auth.ok) {
    respondMutationDenied(res, auth);
    return;
  }

  const parsed = parseLocationCreateInput(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const townHint = await getPlatformTownHint();
  const data = await enrichLocationInputWithGeocode(parsed.data, townHint);

  const [loc] = await db
    .insert(foodTruckLocationsTable)
    .values({ ...data, businessId })
    .returning();
  res.status(201).json(serializeLocation(loc));
});

// PUT /api/businesses/:id/food-truck-locations/:locationId
router.put("/businesses/:id/food-truck-locations/:locationId", async (req, res): Promise<void> => {
  const businessId = parseBusinessId(req.params.id);
  const locationId = parseLocationId(req.params.locationId);
  if (!businessId || !locationId) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const businessAccess = await authorizeBusinessOwnerOrAdmin(req, businessId);
  const [existing] = await db
    .select()
    .from(foodTruckLocationsTable)
    .where(eq(foodTruckLocationsTable.id, locationId));

  const auth = authorizeFoodTruckLocationMutation({
    isAuthenticated: !!getAuth(req).userId,
    businessAccess,
    requestedBusinessId: businessId,
    existingLocation: existing ?? null,
  });
  if (!auth.ok) {
    respondMutationDenied(res, auth);
    return;
  }

  const parsed = parseLocationUpdateInput(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const townHint = await getPlatformTownHint();
  const data = await enrichLocationUpdateWithGeocode(parsed.data, existing!, townHint);

  const [updated] = await db
    .update(foodTruckLocationsTable)
    .set(data)
    .where(eq(foodTruckLocationsTable.id, locationId))
    .returning();
  if (!updated) { res.status(404).json({ error: "Location not found" }); return; }
  res.json(serializeLocation(updated));
});

// DELETE /api/businesses/:id/food-truck-locations/:locationId
router.delete("/businesses/:id/food-truck-locations/:locationId", async (req, res): Promise<void> => {
  const businessId = parseBusinessId(req.params.id);
  const locationId = parseLocationId(req.params.locationId);
  if (!businessId || !locationId) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const businessAccess = await authorizeBusinessOwnerOrAdmin(req, businessId);
  const [existing] = await db
    .select()
    .from(foodTruckLocationsTable)
    .where(eq(foodTruckLocationsTable.id, locationId));

  const auth = authorizeFoodTruckLocationMutation({
    isAuthenticated: !!getAuth(req).userId,
    businessAccess,
    requestedBusinessId: businessId,
    existingLocation: existing ?? null,
  });
  if (!auth.ok) {
    respondMutationDenied(res, auth);
    return;
  }

  await db.delete(foodTruckLocationsTable).where(eq(foodTruckLocationsTable.id, locationId));
  res.status(204).send();
});

function serializePublicLocation(row: {
  id: number;
  businessId: number;
  locationName: string;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  locationDate: string;
  startTime: string | null;
  endTime: string | null;
  locationNotes: string | null;
  isActive: boolean;
  businessName: string;
  businessSlug: string;
  businessType: string;
  businessLogoUrl: string | null;
  businessHeroImageUrl: string | null;
  businessDescription: string | null;
  pickupEnabled: boolean;
}) {
  return {
    id: row.id,
    businessId: row.businessId,
    locationName: row.locationName,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    locationDate: row.locationDate,
    startTime: row.startTime,
    endTime: row.endTime,
    locationNotes: row.locationNotes,
    isActive: row.isActive,
    businessName: row.businessName,
    businessSlug: row.businessSlug,
    businessType: row.businessType,
    businessLogoUrl: row.businessLogoUrl,
    businessHeroImageUrl: row.businessHeroImageUrl,
    businessDescription: row.businessDescription,
    pickupEnabled: row.pickupEnabled,
  };
}

const publicLocationSelect = {
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
  businessType: businessesTable.type,
  businessLogoUrl: businessesTable.logoUrl,
  businessHeroImageUrl: businessesTable.heroImageUrl,
  businessDescription: businessesTable.description,
  pickupEnabled: businessesTable.pickupEnabled,
};

// GET /api/food-truck-locations/today (public)
router.get("/food-truck-locations/today", async (req, res): Promise<void> => {
  const timeZone = await getPlatformTimeZone();
  const today = formatCivilDateInTimeZone(new Date(), timeZone);

  const rows = await db
    .select(publicLocationSelect)
    .from(foodTruckLocationsTable)
    .innerJoin(businessesTable, eq(foodTruckLocationsTable.businessId, businessesTable.id))
    .where(
      and(
        eq(foodTruckLocationsTable.locationDate, today),
        eq(foodTruckLocationsTable.isActive, true),
        eq(businessesTable.active, true),
        eq(businessesTable.isMobileBusiness, true),
      ),
    )
    .orderBy(foodTruckLocationsTable.startTime);

  const townHint = await getPlatformTownHint();
  const enriched: typeof rows = [];
  for (const row of rows) {
    enriched.push(await resolvePublicLocationCoordinates(row, townHint));
  }

  res.json(enriched.map(serializePublicLocation));
});

// GET /api/food-truck-locations/upcoming (public)
router.get("/food-truck-locations/upcoming", async (req, res): Promise<void> => {
  const timeZone = await getPlatformTimeZone();
  const today = formatCivilDateInTimeZone(new Date(), timeZone);
  const horizonDate = addCivilDays(today, 30);

  const rows = await db
    .select(publicLocationSelect)
    .from(foodTruckLocationsTable)
    .innerJoin(businessesTable, eq(foodTruckLocationsTable.businessId, businessesTable.id))
    .where(
      and(
        gt(foodTruckLocationsTable.locationDate, today),
        lte(foodTruckLocationsTable.locationDate, horizonDate),
        eq(foodTruckLocationsTable.isActive, true),
        eq(businessesTable.active, true),
        eq(businessesTable.isMobileBusiness, true),
      ),
    )
    .orderBy(foodTruckLocationsTable.locationDate, foodTruckLocationsTable.startTime);

  res.json(rows.map(serializePublicLocation));
});

export default router;
