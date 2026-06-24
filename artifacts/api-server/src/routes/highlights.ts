import { Router, type IRouter } from "express";
import { db, highlightsTable } from "@workspace/db";
import { eq, and, lte, gte } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireRole";

const router: IRouter = Router();

const highlightInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  relatedBusinessId: z.number().int().optional(),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

function serializeHighlight(h: typeof highlightsTable.$inferSelect) {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    imageUrl: h.imageUrl,
    startDate: h.startDate,
    endDate: h.endDate,
    relatedBusinessId: h.relatedBusinessId,
    buttonText: h.buttonText,
    buttonUrl: h.buttonUrl,
    active: h.active,
    sortOrder: h.sortOrder,
    createdAt: h.createdAt,
  };
}

// GET /api/admin/highlights — all highlights for admin management (no date/active filter)
router.get("/admin/highlights", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const rows = await db
    .select()
    .from(highlightsTable)
    .orderBy(highlightsTable.sortOrder, highlightsTable.createdAt);

  res.json(rows.map(serializeHighlight));
});

// GET /api/highlights — active highlights whose date range includes today
router.get("/highlights", async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const rows = await db
    .select()
    .from(highlightsTable)
    .where(
      and(
        eq(highlightsTable.active, true),
        lte(highlightsTable.startDate, today),
        gte(highlightsTable.endDate, today),
      ),
    )
    .orderBy(highlightsTable.sortOrder);

  res.json(rows.map(serializeHighlight));
});

// GET /api/highlights/:id
router.get("/highlights/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db.select().from(highlightsTable).where(eq(highlightsTable.id, id));
  if (!row) { res.status(404).json({ error: "Highlight not found" }); return; }
  res.json(serializeHighlight(row));
});

// POST /api/highlights (admin only)
router.post("/highlights", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const parsed = highlightInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [row] = await db.insert(highlightsTable).values(parsed.data).returning();
  res.status(201).json(serializeHighlight(row));
});

// PUT /api/highlights/:id (admin only)
router.put("/highlights/:id", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = highlightInputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [updated] = await db.update(highlightsTable).set(parsed.data).where(eq(highlightsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Highlight not found" }); return; }
  res.json(serializeHighlight(updated));
});

// DELETE /api/highlights/:id (admin only)
router.delete("/highlights/:id", requireAdmin, async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(highlightsTable).where(eq(highlightsTable.id, id));
  res.status(204).send();
});

export default router;
