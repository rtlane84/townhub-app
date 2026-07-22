import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { SubmitSupportReportBody } from "@workspace/api-zod";
import { deliverSupportReport } from "../lib/support-report";

const router: IRouter = Router();

// POST /api/support/reports — public customer problem report (emailed to support)
router.post("/support/reports", async (req, res): Promise<void> => {
  const parsed = SubmitSupportReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = getAuth(req);
  const result = await deliverSupportReport({
    category: parsed.data.category,
    message: parsed.data.message,
    contactEmail: parsed.data.contactEmail,
    pagePath: parsed.data.pagePath,
    userAgent: parsed.data.userAgent,
    clerkUserId: userId ?? null,
  });

  if (!result.ok) {
    res.status(503).json({
      error: "Unable to deliver your report right now. Please try again shortly.",
    });
    return;
  }

  res.status(201).json({ ok: true });
});

export default router;
