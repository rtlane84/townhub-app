import { Router, type IRouter } from "express";
import { runSubscriptionTrialReminderJob } from "../lib/subscription-notifications";
import { recordTrialReminderJobRun } from "../lib/background-jobs-run-state";
import { requireJobSecret } from "../middlewares/requireJobSecret";

const router: IRouter = Router();

// POST /api/internal/jobs/subscription-trial-reminders
router.post(
  "/internal/jobs/subscription-trial-reminders",
  requireJobSecret,
  async (_req, res): Promise<void> => {
    try {
      const result = await runSubscriptionTrialReminderJob();
      recordTrialReminderJobRun({ ok: true, result });
      res.json(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Trial reminder job failed";
      recordTrialReminderJobRun({ ok: false, errorMessage });
      res.status(500).json({ error: errorMessage });
    }
  },
);

export default router;
