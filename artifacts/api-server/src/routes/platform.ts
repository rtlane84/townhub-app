import { Router, type IRouter } from "express";
import { db, platformSettingsTable, notificationLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const DEFAULTS = {
  primaryColor: "#1E3A8A",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  buttonColor: "#1E3A8A",
  headingColor: null as string | null,
};

async function getOrCreateTheme() {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.id, 1));
  if (row) return row;
  const [created] = await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...DEFAULTS })
    .onConflictDoNothing()
    .returning();
  return created ?? { id: 1, ...DEFAULTS, updatedAt: new Date() };
}

// GET /api/admin/settings/theme — public read (no auth required)
router.get("/admin/settings/theme", async (req, res): Promise<void> => {
  try {
    const theme = await getOrCreateTheme();
    res.json(theme);
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch platform theme");
    res.status(500).json({ error: "Failed to fetch theme" });
  }
});

// PUT /api/admin/settings/theme — admin only
router.put("/admin/settings/theme", async (req, res): Promise<void> => {
  const allowed = ["primaryColor", "accentColor", "backgroundColor", "buttonColor", "headingColor"];
  const updates: Record<string, string | null> = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key] ?? null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided" });
    return;
  }

  try {
    // Ensure row exists first
    await getOrCreateTheme();

    const [updated] = await db
      .update(platformSettingsTable)
      .set(updates)
      .where(eq(platformSettingsTable.id, 1))
      .returning();

    logger.info({ updates }, "Platform theme updated");
    res.json(updated);
  } catch (err) {
    req.log?.error({ err }, "Failed to update platform theme");
    res.status(500).json({ error: "Failed to update theme" });
  }
});

// GET /api/admin/notification-logs — admin dev inspection
router.get("/admin/notification-logs", async (req, res): Promise<void> => {
  const limitRaw = req.query.limit;
  const limit = limitRaw ? Math.min(parseInt(String(limitRaw), 10), 200) : 50;
  const orderIdRaw = req.query.orderId;

  let rows;
  if (orderIdRaw) {
    rows = await db
      .select()
      .from(notificationLogsTable)
      .where(eq(notificationLogsTable.orderId, parseInt(String(orderIdRaw), 10)))
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(limit);
  } else {
    rows = await db
      .select()
      .from(notificationLogsTable)
      .orderBy(desc(notificationLogsTable.createdAt))
      .limit(limit);
  }

  res.json(rows);
});

export default router;
