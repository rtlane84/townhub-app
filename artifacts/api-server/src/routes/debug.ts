import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Temporary endpoint to verify Sentry error capture. Remove after validation.
router.get("/debug/sentry", () => {
  throw new Error("Sentry Test");
});

export default router;
