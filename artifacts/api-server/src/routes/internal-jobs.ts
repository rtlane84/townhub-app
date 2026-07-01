import { Router, type IRouter } from "express";
import { runSubscriptionTrialReminderJob } from "../lib/subscription-notifications";
import { requireJobSecret } from "../middlewares/requireJobSecret";

const router: IRouter = Router();

router.use(requireJobSecret);

// POST /api/internal/jobs/subscription-trial-reminders
router.post("/internal/jobs/subscription-trial-reminders", async (_req, res): Promise<void> => {
  const result = await runSubscriptionTrialReminderJob();
  res.json(result);
});

export default router;
