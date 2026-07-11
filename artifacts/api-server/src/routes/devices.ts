import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth } from "../middlewares/requireAuth";
import {
  isValidDevicePlatform,
  listDeviceTokensForUser,
  registerDeviceToken,
  unregisterAllDeviceTokensForUser,
  unregisterDeviceToken,
} from "../lib/device-tokens";
import {
  getUserNotificationPreferences,
  upsertUserNotificationPreferences,
} from "../lib/user-notification-preferences";
import { getNotificationCategory } from "../lib/notification-categories";
import { deliverPushToUsers } from "../lib/push-delivery";
import { buildNotificationDeepLinkPath } from "../lib/notification-deep-links";

const router: IRouter = Router();

const RegisterDeviceBody = z.object({
  token: z.string().min(8).max(4096),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
  appVersion: z.string().max(64).optional().nullable(),
  deviceLabel: z.string().max(128).optional().nullable(),
});

const UnregisterDeviceBody = z.object({
  token: z.string().min(1).max(4096).optional(),
  all: z.boolean().optional(),
});

const PreferenceUpdateBody = z.object({
  preferences: z
    .array(
      z.object({
        category: z.string().min(1),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(50),
});

function serializeDevice(row: {
  id: number;
  platform: string;
  appVersion: string | null;
  deviceLabel: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    platform: row.platform,
    appVersion: row.appVersion,
    deviceLabel: row.deviceLabel,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

// POST /api/devices — register / refresh a push device token after login
router.post("/devices", requireAuth, async (req, res): Promise<void> => {
  const parsed = RegisterDeviceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  if (!isValidDevicePlatform(parsed.data.platform)) {
    res.status(400).json({ message: "Invalid platform" });
    return;
  }

  try {
    const device = await registerDeviceToken({
      userId: req.dbUser!.id,
      token: parsed.data.token,
      platform: parsed.data.platform,
      appVersion: parsed.data.appVersion,
      deviceLabel: parsed.data.deviceLabel,
    });
    res.status(201).json(serializeDevice(device));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to register device";
    res.status(400).json({ message });
  }
});

// GET /api/devices — list devices for the current user (tokens redacted)
router.get("/devices", requireAuth, async (req, res): Promise<void> => {
  const devices = await listDeviceTokensForUser(req.dbUser!.id);
  res.json(devices.map(serializeDevice));
});

// DELETE /api/devices — unregister current device token, or all devices on logout
router.delete("/devices", requireAuth, async (req, res): Promise<void> => {
  const parsed = UnregisterDeviceBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  if (parsed.data.all) {
    const removed = await unregisterAllDeviceTokensForUser(req.dbUser!.id);
    res.json({ ok: true, removed });
    return;
  }

  const token = parsed.data.token?.trim();
  if (!token) {
    res.status(400).json({ message: "token is required unless all=true" });
    return;
  }

  const removed = await unregisterDeviceToken(req.dbUser!.id, token);
  res.json({ ok: true, removed: removed ? 1 : 0 });
});

// GET /api/me/notification-preferences
router.get("/me/notification-preferences", requireAuth, async (req, res): Promise<void> => {
  const audience = typeof req.query.audience === "string" ? req.query.audience : undefined;
  const implementedOnly = req.query.implementedOnly !== "false";

  const preferences = await getUserNotificationPreferences(req.dbUser!.id, {
    audience: audience as "PLATFORM_ADMIN" | "BUSINESS_OWNER" | "CUSTOMER" | undefined,
    implementedOnly,
  });

  res.json({
    preferences: preferences.map((p) => ({
      category: p.category,
      enabled: p.enabled,
      label: p.label,
      description: p.description,
      audience: p.audience,
      implemented: p.implemented,
      explicit: p.explicit,
    })),
  });
});

// PUT /api/me/notification-preferences
router.put("/me/notification-preferences", requireAuth, async (req, res): Promise<void> => {
  const parsed = PreferenceUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const invalid = parsed.data.preferences.filter((p) => !getNotificationCategory(p.category));
  if (invalid.length > 0) {
    res.status(400).json({
      message: `Unknown categories: ${invalid.map((p) => p.category).join(", ")}`,
    });
    return;
  }

  const preferences = await upsertUserNotificationPreferences(
    req.dbUser!.id,
    parsed.data.preferences,
  );

  res.json({
    preferences: preferences.map((p) => ({
      category: p.category,
      enabled: p.enabled,
      label: p.label,
      description: p.description,
      audience: p.audience,
      implemented: p.implemented,
      explicit: p.explicit,
    })),
  });
});

// POST /api/me/notifications/test-push — send a test push to the current user's devices
router.post("/me/notifications/test-push", requireAuth, async (req, res): Promise<void> => {
  const deepLink = buildNotificationDeepLinkPath({ type: "BUSINESS_DASHBOARD" });
  try {
    await deliverPushToUsers({
      userIds: [req.dbUser!.id],
      businessId: 0,
      eventType: "NEW_ORDER",
      title: "TownHub test notification",
      body: "Push notifications are working on this device.",
      deepLink,
      category: "OWNER_NEW_ORDER",
    });
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send test push";
    res.status(500).json({ ok: false, message });
  }
});

export default router;
