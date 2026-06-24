import { Router, type IRouter } from "express";
import { db, eventsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { z } from "zod";

const router: IRouter = Router();

const eventInputSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  relatedBusinessId: z.number().int().optional(),
  eventType: z.enum(["COMMUNITY", "FOOD_TRUCK", "SEASONAL", "SALE", "HOLIDAY", "MARKET", "OTHER"]).default("COMMUNITY"),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    description: e.description,
    imageUrl: e.imageUrl,
    relatedBusinessId: e.relatedBusinessId,
    eventType: e.eventType,
    featured: e.featured,
    active: e.active,
    createdAt: e.createdAt,
  };
}

// GET /api/events
router.get("/events", async (req, res): Promise<void> => {
  const { featured, upcoming } = req.query as Record<string, string>;

  const conditions = [eq(eventsTable.active, true)];
  if (featured === "true") conditions.push(eq(eventsTable.featured, true));
  if (upcoming === "true") {
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(gte(eventsTable.date, today));
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(and(...conditions))
    .orderBy(eventsTable.date);

  res.json(events.map(serializeEvent));
});

// GET /api/events/:id
router.get("/events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(serializeEvent(event));
});

// POST /api/events (admin only)
router.post("/events", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = eventInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [event] = await db.insert(eventsTable).values(parsed.data).returning();
  res.status(201).json(serializeEvent(event));
});

// PUT /api/events/:id (admin only)
router.put("/events/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  const parsed = eventInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(eventsTable).set(parsed.data).where(eq(eventsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Event not found" }); return; }
  res.json(serializeEvent(updated));
});

// DELETE /api/events/:id (admin only)
router.delete("/events/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(req.params.id, 10);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

export default router;
