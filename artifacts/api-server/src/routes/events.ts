import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, eventsTable } from "@workspace/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireRole";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

const eventTypeSchema = z.enum([
  "COMMUNITY",
  "FOOD_TRUCK",
  "SEASONAL",
  "SALE",
  "HOLIDAY",
  "MARKET",
  "OTHER",
]);

const eventFieldsSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  relatedBusinessId: z.number().int().optional(),
  eventType: eventTypeSchema.default("COMMUNITY"),
  featured: z.boolean().optional().default(false),
  active: z.boolean().optional().default(true),
});

const eventSubmitSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().min(1),
  endDate: z.string().optional().nullable(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().max(500).optional(),
  description: z.string().max(5000).optional(),
  imageUrl: z.string().max(2000).optional(),
  eventType: eventTypeSchema.optional().default("COMMUNITY"),
  submitterName: z.string().max(200).optional(),
  submitterEmail: z.string().email().max(320).optional().or(z.literal("")),
  /** Honeypot — bots fill this; humans leave empty. */
  website: z.string().max(500).optional(),
});

function validateEventDates(data: { date: string; endDate?: string | null }, ctx: z.RefinementCtx) {
  if (data.endDate && data.endDate < data.date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after the start date",
      path: ["endDate"],
    });
  }
}

const eventInputSchema = eventFieldsSchema.superRefine(validateEventDates);
const eventSubmitInputSchema = eventSubmitSchema.superRefine(validateEventDates);

function serializeEvent(e: typeof eventsTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    endDate: e.endDate,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    description: e.description,
    imageUrl: e.imageUrl,
    relatedBusinessId: e.relatedBusinessId,
    eventType: e.eventType,
    featured: e.featured,
    active: e.active,
    status: e.status,
    submitterName: e.submitterName,
    submitterEmail: e.submitterEmail,
    reviewNote: e.reviewNote,
    reviewedAt: e.reviewedAt,
    createdAt: e.createdAt,
  };
}

// Upcoming = start date in the future, or multi-day event whose end date is still today/later.
function upcomingCondition(today: string) {
  return gte(sql`COALESCE(${eventsTable.endDate}, ${eventsTable.date})`, today);
}

function isPubliclyVisible(e: typeof eventsTable.$inferSelect) {
  return e.active && e.status === "APPROVED";
}

// GET /api/events — public approved + active only
router.get("/events", async (req, res): Promise<void> => {
  const { featured, upcoming } = req.query as Record<string, string>;

  const conditions = [
    eq(eventsTable.active, true),
    eq(eventsTable.status, "APPROVED"),
  ];
  if (featured === "true") conditions.push(eq(eventsTable.featured, true));
  if (upcoming === "true") {
    const today = new Date().toISOString().slice(0, 10);
    conditions.push(upcomingCondition(today));
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(and(...conditions))
    .orderBy(eventsTable.date);

  res.json(events.map(serializeEvent));
});

// POST /api/events/submit — public community submission (pending review)
router.post("/events/submit", async (req, res): Promise<void> => {
  const parsed = eventSubmitInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Honeypot filled → pretend success without persisting
  if (parsed.data.website?.trim()) {
    res.status(201).json({
      id: 0,
      title: parsed.data.title,
      date: parsed.data.date,
      endDate: parsed.data.endDate ?? null,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      location: parsed.data.location ?? null,
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      relatedBusinessId: null,
      eventType: parsed.data.eventType,
      featured: false,
      active: false,
      status: "PENDING",
      submitterName: parsed.data.submitterName ?? null,
      submitterEmail: parsed.data.submitterEmail || null,
      reviewNote: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      title: parsed.data.title.trim(),
      date: parsed.data.date,
      endDate: parsed.data.endDate || null,
      startTime: parsed.data.startTime || null,
      endTime: parsed.data.endTime || null,
      location: parsed.data.location?.trim() || null,
      description: parsed.data.description?.trim() || null,
      imageUrl: parsed.data.imageUrl?.trim() || null,
      eventType: parsed.data.eventType,
      featured: false,
      active: false,
      status: "PENDING",
      submitterName: parsed.data.submitterName?.trim() || null,
      submitterEmail: parsed.data.submitterEmail?.trim() || null,
    })
    .returning();

  res.status(201).json(serializeEvent(event));
});

// GET /api/admin/events — admin list (all statuses)
router.get("/admin/events", requireAdmin, async (req, res): Promise<void> => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const conditions = [];
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    conditions.push(eq(eventsTable.status, status));
  }

  const events = await db
    .select()
    .from(eventsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(eventsTable.createdAt));

  res.json(events.map(serializeEvent));
});

// POST /api/admin/events/:id/approve
router.post("/admin/events/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing.status !== "PENDING") {
    res.status(409).json({ error: "Event is not pending review" });
    return;
  }

  const auth = getAuth(req);
  const [updated] = await db
    .update(eventsTable)
    .set({
      status: "APPROVED",
      active: true,
      reviewedAt: new Date(),
      reviewedBy: auth.userId ?? null,
      reviewNote: null,
    })
    .where(eq(eventsTable.id, id))
    .returning();

  res.json(serializeEvent(updated));
});

// POST /api/admin/events/:id/reject
router.post("/admin/events/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const note =
    typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 2000) : undefined;

  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing.status !== "PENDING") {
    res.status(409).json({ error: "Event is not pending review" });
    return;
  }

  const auth = getAuth(req);
  const [updated] = await db
    .update(eventsTable)
    .set({
      status: "REJECTED",
      active: false,
      featured: false,
      reviewedAt: new Date(),
      reviewedBy: auth.userId ?? null,
      reviewNote: note || null,
    })
    .where(eq(eventsTable.id, id))
    .returning();

  res.json(serializeEvent(updated));
});

// GET /api/events/:id — public approved + active only
router.get("/events/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!event || !isPubliclyVisible(event)) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(serializeEvent(event));
});

// POST /api/events (admin only) — curated events go live as approved
router.post("/events", requireAdmin, async (req, res): Promise<void> => {
  const parsed = eventInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      ...parsed.data,
      status: "APPROVED",
    })
    .returning();
  res.status(201).json(serializeEvent(event));
});

// PUT /api/events/:id (admin only)
router.put("/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const parsed = eventFieldsSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const startDate = parsed.data.date ?? existing.date;
  const endDate = parsed.data.endDate !== undefined ? parsed.data.endDate : existing.endDate;
  if (endDate && endDate < startDate) {
    res.status(400).json({ error: "End date must be on or after the start date" });
    return;
  }

  const [updated] = await db
    .update(eventsTable)
    .set(parsed.data)
    .where(eq(eventsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json(serializeEvent(updated));
});

// DELETE /api/events/:id (admin only)
router.delete("/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.status(204).send();
});

export default router;
