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
  heroOverlayImageUrl: null as string | null,
  heroImageFit: "cover" as "cover" | "contain",
  heroImagePosition: "center" as "center" | "top" | "bottom",
  heroOverlaySize: "medium" as "small" | "medium" | "large",
  heroOverlayAlign: "center" as "left" | "center" | "right",
  showShopButton: true,
  showListBusinessButton: true,
  heroButtonPlacement: "bottom-center" as
    | "bottom-left"
    | "bottom-center"
    | "bottom-right",
  logoSizePx: 24,
  weatherEnabled: false,
  weatherLocation: null as string | null,
};

function clampLogoSize(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (Number.isNaN(n)) return THEME_DEFAULTS.logoSizePx;
  return Math.min(192, Math.max(16, Math.round(n)));
}

function normalizeHeroImageFit(value: unknown): "cover" | "contain" {
  return value === "contain" ? "contain" : THEME_DEFAULTS.heroImageFit;
}

function normalizeHeroImagePosition(value: unknown): "center" | "top" | "bottom" {
  if (value === "top" || value === "bottom") return value;
  return THEME_DEFAULTS.heroImagePosition;
}

function normalizeHeroOverlaySize(value: unknown): "small" | "medium" | "large" {
  if (value === "small" || value === "large") return value;
  return THEME_DEFAULTS.heroOverlaySize;
}

function normalizeHeroOverlayAlign(value: unknown): "left" | "center" | "right" {
  if (value === "left" || value === "right") return value;
  return THEME_DEFAULTS.heroOverlayAlign;
}

function normalizeHeroButtonPlacement(
  value: unknown,
): "bottom-left" | "bottom-center" | "bottom-right" {
  if (value === "bottom-left" || value === "bottom-right") return value;
  return THEME_DEFAULTS.heroButtonPlacement;
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
    heroOverlayImageUrl: row.heroOverlayImageUrl,
    heroImageFit: normalizeHeroImageFit(row.heroImageFit),
    heroImagePosition: normalizeHeroImagePosition(row.heroImagePosition),
    heroOverlaySize: normalizeHeroOverlaySize(row.heroOverlaySize),
    heroOverlayAlign: normalizeHeroOverlayAlign(row.heroOverlayAlign),
    showShopButton: row.showShopButton ?? THEME_DEFAULTS.showShopButton,
    showListBusinessButton:
      row.showListBusinessButton ?? THEME_DEFAULTS.showListBusinessButton,
    heroButtonPlacement: normalizeHeroButtonPlacement(row.heroButtonPlacement),
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
    "heroOverlayImageUrl",
    "heroImageFit",
    "heroImagePosition",
    "heroOverlaySize",
    "heroOverlayAlign",
    "showShopButton",
    "showListBusinessButton",
    "heroButtonPlacement",
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
      if (key === "weatherEnabled") {
        updates[key] = Boolean(value);
        continue;
      }
      if (key === "showShopButton" || key === "showListBusinessButton") {
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
      if (key === "heroOverlaySize") {
        updates[key] = normalizeHeroOverlaySize(value);
        continue;
      }
      if (key === "heroOverlayAlign") {
        updates[key] = normalizeHeroOverlayAlign(value);
        continue;
      }
      if (key === "heroButtonPlacement") {
        updates[key] = normalizeHeroButtonPlacement(value);
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
