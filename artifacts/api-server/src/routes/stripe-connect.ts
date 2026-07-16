import { Router, type IRouter } from "express";
import { authorizeBusinessOwnerOrAdmin } from "../lib/business-access";
import { getAppBaseUrl } from "../lib/app-base-url";
import { stripe } from "../lib/stripe";
import {
  syncBusinessStripeConnectStatus,
  ensureExpressConnectedAccount,
  createConnectOnboardingLink,
  createConnectDashboardLink,
  deriveConnectPaymentStatus,
  retrieveConnectAccount,
} from "../lib/stripe-connect";
import { requireAuth } from "../middlewares/requireRole";
import { mapStripeConnectStartError } from "../lib/stripe-connect-errors";

const router: IRouter = Router();

function parseBusinessId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function settingsReturnUrl(businessId: number): string {
  // HTTPS bounce required by Stripe Account Links; page deep-links into Cap.
  return `${getAppBaseUrl()}/native-stripe-connect-return/?businessId=${businessId}`;
}

// GET /api/businesses/:businessId/stripe/status
router.get("/businesses/:businessId/stripe/status", requireAuth, async (req, res): Promise<void> => {
  const businessId = parseBusinessId(req.params.businessId);
  if (!Number.isFinite(businessId)) {
    res.status(400).json({ error: "Invalid business id" });
    return;
  }

  const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
  if (!access.ok) {
    res.status(access.status).json({ error: access.error });
    return;
  }

  const status = await syncBusinessStripeConnectStatus(businessId);
  res.json(status);
});

// POST /api/businesses/:businessId/stripe/connect/start
router.post(
  "/businesses/:businessId/stripe/connect/start",
  requireAuth,
  async (req, res): Promise<void> => {
    const businessId = parseBusinessId(req.params.businessId);
    if (!Number.isFinite(businessId)) {
      res.status(400).json({ error: "Invalid business id" });
      return;
    }

    const access = await authorizeBusinessOwnerOrAdmin(req, businessId);
    if (!access.ok) {
      res.status(access.status).json({ error: access.error });
      return;
    }

    if (!stripe) {
      res.status(503).json({ error: "Stripe is not configured on this platform" });
      return;
    }

    try {
      const accountId = await ensureExpressConnectedAccount(access.business);
      const returnUrl = settingsReturnUrl(businessId);
      const refreshUrl = settingsReturnUrl(businessId);

      const body = req.body as { action?: string } | undefined;
      const account = await retrieveConnectAccount(accountId);
      const paymentStatus = deriveConnectPaymentStatus(account, accountId);

      if (body?.action === "dashboard" && paymentStatus === "connected") {
        const url = await createConnectDashboardLink(accountId);
        res.json({ url, action: "dashboard" });
        return;
      }

      const url = await createConnectOnboardingLink(accountId, returnUrl, refreshUrl);
      res.json({ url, action: "onboarding" });
    } catch (err) {
      const mapped = mapStripeConnectStartError(err);
      if (mapped.status >= 500) {
        req.log.error({ err, businessId, code: mapped.code }, "Failed to start Stripe Connect onboarding");
      } else {
        req.log.warn({ businessId, code: mapped.code }, mapped.error);
      }
      res.status(mapped.status).json({ error: mapped.error, code: mapped.code });
    }
  },
);

export default router;
