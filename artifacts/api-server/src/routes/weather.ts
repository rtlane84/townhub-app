import { Router, type IRouter } from "express";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { recordWeatherRefresh } from "../lib/system-runtime-state";
import {
  buildDemoWeatherForecast,
  fetchWeatherForecast,
  shouldUseWeatherDemoFallback,
} from "../lib/weather";

const router: IRouter = Router();

async function getSettingsRow() {
  const [row] = await db.select().from(platformSettingsTable).where(eq(platformSettingsTable.id, 1));
  return row ?? null;
}

function resolveLocationQuery(settings: {
  weatherLocation: string | null;
  townName: string | null;
}): string | null {
  const configured = settings.weatherLocation?.trim();
  if (configured) return configured;
  const town = settings.townName?.trim();
  return town || null;
}

// GET /api/weather — public; returns forecast when admin has enabled the widget
router.get("/weather", async (req, res): Promise<void> => {
  try {
    const settings = await getSettingsRow();
    if (!settings?.weatherEnabled) {
      res.json({ enabled: false });
      return;
    }

    const locationQuery = resolveLocationQuery(settings);
    if (!locationQuery) {
      logger.warn("Weather widget enabled but location is missing");
      res.json({
        enabled: true,
        unavailable: true,
        reason: "missing_location",
        message: "Weather is enabled but no location is configured.",
        locationQuery: "",
      });
      return;
    }

    const result = await fetchWeatherForecast(locationQuery);
    if (!result.ok) {
      logger.warn(
        {
          reason: result.reason,
          locationQuery: result.locationQuery,
          message: result.message,
        },
        "Weather forecast unavailable",
      );

      if (shouldUseWeatherDemoFallback()) {
        logger.info(
          { locationQuery: result.locationQuery, reason: result.reason },
          "Serving weather demo fallback",
        );
        res.json(buildDemoWeatherForecast(result.locationQuery));
        return;
      }

      res.json({
        enabled: true,
        unavailable: true,
        reason: result.reason,
        message: result.message,
        locationQuery: result.locationQuery,
      });
      return;
    }

    res.json(result.forecast);
    recordWeatherRefresh(locationQuery);
  } catch (err) {
    logger.error({ err }, "Unexpected weather route failure");
    res.status(500).json({
      enabled: true,
      unavailable: true,
      reason: "forecast_failed",
      message: "Unexpected server error while loading weather.",
    });
  }
});

export default router;
