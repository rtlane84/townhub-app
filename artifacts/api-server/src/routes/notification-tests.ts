import { Router, type IRouter } from "express";
import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireRole";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import {
  resolveOwnerNotificationEmail,
  resolveOwnerNotificationPhone,
} from "../lib/owner-notification-settings";
import { deliverOwnerEmail, deliverOwnerSms, deliverOwnerDiscord, deliverOwnerNtfy } from "../lib/notification-delivery";
import {
  buildOwnerDiscordTestPayload,
  sendOwnerDiscordWebhook,
} from "../lib/discord-owner-notifications";
import { isValidDiscordWebhookUrl, normalizeDiscordWebhookUrl } from "../lib/discord-webhook";
import {
  buildOwnerNtfyTestMessage,
  sendOwnerNtfyNotification,
} from "../lib/ntfy-owner-notifications";
import { ntfySettingsForRegenerate } from "../lib/ntfy-business-settings";
import { isValidNtfyTopic } from "../lib/ntfy-topic";
import { serializeBusiness } from "./businesses";

const router: IRouter = Router();

async function authorizeOwnerBusiness(req: Request, businessId: number) {
  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) return access;
  return { ok: true as const, business: access.business };
}

// POST /api/businesses/:businessId/notifications/test/email
router.post(
  "/businesses/:businessId/notifications/test/email",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseInt(String(req.params.businessId), 10);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ message: "Invalid business id" });
      return;
    }

    const access = await authorizeOwnerBusiness(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ message: access.error });
      return;
    }
    const { business } = access;

    const to = resolveOwnerNotificationEmail(business);
    if (!to) {
      res.status(400).json({ message: "No notification email configured for this business" });
      return;
    }

    const subject = `[Test] ${business.name} notification email`;
    const body = `This is a test notification email from TownHub for ${business.name}. If you received this, email alerts are configured correctly.`;

    try {
      await deliverOwnerEmail({
        businessId,
        eventType: "NEW_ORDER",
        to,
        subject,
        body,
      });
      res.json({ ok: true, channel: "EMAIL", recipient: to });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test email";
      res.status(500).json({ ok: false, message });
    }
  },
);

// POST /api/businesses/:businessId/notifications/test/sms
router.post(
  "/businesses/:businessId/notifications/test/sms",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseInt(String(req.params.businessId), 10);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ message: "Invalid business id" });
      return;
    }

    const access = await authorizeOwnerBusiness(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ message: access.error });
      return;
    }
    const { business } = access;

    const to = resolveOwnerNotificationPhone(business);
    if (!to) {
      res.status(400).json({ message: "No notification phone configured for this business" });
      return;
    }

    const body = `TownHub test SMS for ${business.name}. SMS alerts are configured correctly.`;

    try {
      await deliverOwnerSms({
        businessId,
        eventType: "NEW_ORDER",
        to,
        body,
      });
      res.json({ ok: true, channel: "SMS", recipient: to });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test SMS";
      res.status(500).json({ ok: false, message });
    }
  },
);

// POST /api/businesses/:businessId/notifications/test/discord
router.post(
  "/businesses/:businessId/notifications/test/discord",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseInt(String(req.params.businessId), 10);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ message: "Invalid business id" });
      return;
    }

    const access = await authorizeOwnerBusiness(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ message: access.error });
      return;
    }
    const { business } = access;

    const webhookUrl = normalizeDiscordWebhookUrl(business.discordWebhookUrl);
    if (!webhookUrl || !isValidDiscordWebhookUrl(webhookUrl)) {
      res.status(400).json({ message: "Add a valid Discord webhook URL and save settings first" });
      return;
    }

    const payload = buildOwnerDiscordTestPayload(business.name);
    try {
      await deliverOwnerDiscord({
        businessId,
        eventType: "NEW_ORDER",
        webhookUrl,
        body: payload.embeds[0]?.description ?? "Test notification",
        send: () => sendOwnerDiscordWebhook({ webhookUrl, payload }),
      });
      res.json({ ok: true, channel: "DISCORD", recipient: "Discord webhook" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test Discord message";
      res.status(500).json({ ok: false, message });
    }
  },
);

// POST /api/businesses/:businessId/notifications/test/ntfy
router.post(
  "/businesses/:businessId/notifications/test/ntfy",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseInt(String(req.params.businessId), 10);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ message: "Invalid business id" });
      return;
    }

    const access = await authorizeOwnerBusiness(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ message: access.error });
      return;
    }
    const { business } = access;

    if (!business.ntfyEnabled) {
      res.status(400).json({ message: "Enable free phone notifications first" });
      return;
    }

    const topic = business.ntfyTopic?.trim();
    if (!topic || !isValidNtfyTopic(topic)) {
      res.status(400).json({ message: "No valid ntfy topic configured for this business" });
      return;
    }

    const ntfy = buildOwnerNtfyTestMessage(business.name);
    try {
      await deliverOwnerNtfy({
        businessId,
        eventType: "NEW_ORDER",
        topic,
        title: ntfy.title,
        body: ntfy.message,
        send: () =>
          sendOwnerNtfyNotification({
            topic,
            title: ntfy.title,
            message: ntfy.message,
            tags: ntfy.tags,
          }),
      });

      await db
        .update(businessesTable)
        .set({ ntfyLastTestAt: new Date() })
        .where(eq(businessesTable.id, businessId));

      res.json({ ok: true, channel: "NTFY", recipient: "ntfy phone subscription" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test ntfy notification";
      res.status(500).json({ ok: false, message });
    }
  },
);

// POST /api/businesses/:businessId/notifications/ntfy/regenerate-topic
router.post(
  "/businesses/:businessId/notifications/ntfy/regenerate-topic",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseInt(String(req.params.businessId), 10);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ message: "Invalid business id" });
      return;
    }

    const access = await authorizeOwnerBusiness(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ message: access.error });
      return;
    }

    try {
      const [business] = await db
        .update(businessesTable)
        .set(ntfySettingsForRegenerate())
        .where(eq(businessesTable.id, businessId))
        .returning();

      if (!business) {
        res.status(404).json({ message: "Business not found" });
        return;
      }

      res.json(serializeBusiness(business));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to regenerate ntfy topic";
      res.status(500).json({ message });
    }
  },
);

export default router;
