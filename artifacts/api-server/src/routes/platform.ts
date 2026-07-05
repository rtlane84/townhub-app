import { Router, type IRouter, type Request, type Response } from "express";
import { db, platformSettingsTable, notificationLogsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
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
  heroOverlayColor: "#000000",
  heroOverlayOpacity: 45,
  heroButtonColor: "#ffffff",
  heroHeadlineAccentColor: null as string | null,
  heroHeadlineLine1: null as string | null,
  heroHeadlineLine2: null as string | null,
  heroImageFit: "cover" as "cover" | "contain",
  heroImagePosition: "center" as "center" | "top" | "bottom",
  showHeroText: true,
  showHeroButtons: true,
  logoSizePx: 24,
  weatherEnabled: false,
  weatherLocation: null as string | null,
};

function clampLogoSize(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return THEME_DEFAULTS.logoSizePx;
  return Math.min(192, Math.max(16, Math.round(n)));
}

function clampHeroOverlayOpacity(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return THEME_DEFAULTS.heroOverlayOpacity;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizeHeroImageFit(value: unknown): "cover" | "contain" {
  return value === "contain" ? "contain" : THEME_DEFAULTS.heroImageFit;
}

function normalizeHeroImagePosition(value: unknown): "center" | "top" | "bottom" {
  if (value === "top" || value === "bottom") return value;
  return THEME_DEFAULTS.heroImagePosition;
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
    heroOverlayColor: row.heroOverlayColor,
    heroOverlayOpacity: row.heroOverlayOpacity ?? THEME_DEFAULTS.heroOverlayOpacity,
    heroButtonColor: row.heroButtonColor,
    heroHeadlineAccentColor: row.heroHeadlineAccentColor,
    heroHeadlineLine1: row.heroHeadlineLine1,
    heroHeadlineLine2: row.heroHeadlineLine2,
    heroImageFit: normalizeHeroImageFit(row.heroImageFit),
    heroImagePosition: normalizeHeroImagePosition(row.heroImagePosition),
    showHeroText: row.showHeroText ?? THEME_DEFAULTS.showHeroText,
    showHeroButtons: row.showHeroButtons ?? THEME_DEFAULTS.showHeroButtons,
    logoSizePx: row.logoSizePx ?? THEME_DEFAULTS.logoSizePx,
    weatherEnabled: row.weatherEnabled ?? THEME_DEFAULTS.weatherEnabled,
    weatherLocation: row.weatherLocation,
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
router.get("/admin/settings/theme", getPlatformThemeHandler);
// Alias for public clients; same handler as admin path above.
router.get("/platform/theme", getPlatformThemeHandler);

async function getPlatformThemeHandler(req: Request, res: Response): Promise<void> {
  try {
    const settings = await getOrCreateSettings();
    res.json(serializePlatformSettings(settings));
  } catch (err) {
    req.log?.error({ err }, "Failed to fetch platform settings");
    res.status(500).json({ error: "Failed to fetch platform settings" });
  }
}

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
    "heroOverlayColor",
    "heroOverlayOpacity",
    "heroButtonColor",
    "heroHeadlineAccentColor",
    "heroHeadlineLine1",
    "heroHeadlineLine2",
    "heroImageFit",
    "heroImagePosition",
    "showHeroText",
    "showHeroButtons",
    "logoSizePx",
    "weatherEnabled",
    "weatherLocation",
  ] as const;

  const updates: Record<string, string | null | number | boolean> = {};
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
      if (key === "heroOverlayOpacity") {
        if (value === "" || value === undefined || value === null) {
          updates[key] = THEME_DEFAULTS.heroOverlayOpacity;
        } else {
          updates[key] = clampHeroOverlayOpacity(value);
        }
        continue;
      }
      if (key === "weatherEnabled") {
        updates[key] = Boolean(value);
        continue;
      }
      if (key === "showHeroText" || key === "showHeroButtons") {
        updates[key] = Boolean(value);
        continue;
      }
      if (key === "heroImageFit") {
        updates[key] = normalizeHeroImageFit(value);
        continue;
      }
      if (key === "heroImagePosition") {
        updates[key] = normalizeHeroImagePosition(value);
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
  const statusRaw = req.query.status;
  const channelRaw = req.query.channel;
  const eventTypeRaw = req.query.eventType;

  const conditions = [];
  if (orderIdRaw) {
    conditions.push(eq(notificationLogsTable.orderId, parseInt(String(orderIdRaw), 10)));
  }
  if (statusRaw && typeof statusRaw === "string") {
    conditions.push(eq(notificationLogsTable.status, statusRaw));
  }
  if (channelRaw && typeof channelRaw === "string") {
    conditions.push(eq(notificationLogsTable.channel, channelRaw));
  }
  if (eventTypeRaw && typeof eventTypeRaw === "string") {
    conditions.push(eq(notificationLogsTable.eventType, eventTypeRaw));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(notificationLogsTable)
    .where(whereClause)
    .orderBy(desc(notificationLogsTable.createdAt))
    .limit(limit);

  res.json(rows.map(serializeNotificationLog));
});

export default router;
