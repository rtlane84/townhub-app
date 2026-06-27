import { Router, type IRouter } from "express";
import { db, platformSettingsTable, notificationLogsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { serializeNotificationLog } from "../lib/notifications";

const router: IRouter = Router();

const THEME_DEFAULTS = {
  primaryColor: "#1E3A8A",
  accentColor: "#F59E0B",
  backgroundColor: "#F8FAFC",
  buttonColor: "#1E3A8A",
  headingColor: null as string | null,
  platformName: null as string | null,
  townName: null as string | null,
  tagline: null as string | null,
  logoUrl: null as string | null,
  heroImageUrl: null as string | null,
  logoSizePx: 24,
};

function clampLogoSize(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return THEME_DEFAULTS.logoSizePx;
  return Math.min(64, Math.max(16, Math.round(n)));
}

function serializePlatformSettings(row: typeof platformSettingsTable.$inferSelect) {
  return {
    id: row.id,
    primaryColor: row.primaryColor,
    accentColor: row.accentColor,
    backgroundColor: row.backgroundColor,
    buttonColor: row.buttonColor,
    headingColor: row.headingColor,
    platformName: row.platformName,
    townName: row.townName,
    tagline: row.tagline,
    logoUrl: row.logoUrl,
    heroImageUrl: row.heroImageUrl,
    logoSizePx: row.logoSizePx ?? THEME_DEFAULTS.logoSizePx,
    updatedAt: row.updatedAt,
  };
}

async function getOrCreateSettings() {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.id, 1));
  if (row) return row;
  const [created] = await db
    .insert(platformSettingsTable)
    .values({ id: 1, ...THEME_DEFAULTS })
    .onConflictDoNothing()
    .returning();
  return created ?? { id: 1, ...THEME_DEFAULTS, updatedAt: new Date() };
}

// GET /api/admin/settings/theme — public read (theme + branding)
router.get("/admin/settings/theme", async (req, res): Promise<void> => {
  try {
    const settings = await getOrCreateSettings();
    res.json(serializePlatformSettings(settings));
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch platform settings");
    res.status(500).json({ error: "Failed to fetch platform settings" });
  }
});

// PUT /api/admin/settings/theme — admin only (global requireAdmin middleware)
router.put("/admin/settings/theme", async (req, res): Promise<void> => {
  const allowed = [
    "primaryColor",
    "accentColor",
    "backgroundColor",
    "buttonColor",
    "headingColor",
    "platformName",
    "townName",
    "tagline",
    "logoUrl",
    "heroImageUrl",
    "logoSizePx",
  ] as const;

  const updates: Record<string, string | null | number> = {};
  for (const key of allowed) {
    if (key in req.body) {
      const value = req.body[key];
      if (key === "logoSizePx") {
        if (value === "" || value === undefined || value === null) {
          updates[key] = THEME_DEFAULTS.logoSizePx;
        } else {
          updates[key] = clampLogoSize(value);
        }
        continue;
      }
      if (value === "" || value === undefined) {
        updates[key] = null;
      } else if (typeof value === "string") {
        updates[key] = value.trim() || null;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields provided" });
    return;
  }

  try {
    await getOrCreateSettings();

    const [updated] = await db
      .update(platformSettingsTable)
      .set(updates)
      .where(eq(platformSettingsTable.id, 1))
      .returning();

    logger.info({ updates: Object.keys(updates) }, "Platform settings updated");
    res.json(serializePlatformSettings(updated));
  } catch (err) {
    req.log?.error({ err }, "Failed to update platform settings");
    res.status(500).json({ error: "Failed to update platform settings" });
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

  res.json(rows.map(serializeNotificationLog));
});

export default router;
