import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod/v4";
import {
  assertDevClerkRelinkAllowed,
  diagnoseClerkRelink,
  formatRelinkDiagnosis,
  formatRelinkResult,
  formatRelinkScan,
  isDevClerkRelinkAllowed,
  scanClerkRelinkSituation,
  relinkClerkUserByEmail,
  relinkClerkUserByPreviousId,
} from "../lib/relink-clerk-user";

const router: IRouter = Router();

// Only gate /dev/* — a bare router.use() would 404 every later /api route in production
// (businesses, orders, products, admin) because this router is mounted before them.
router.use("/dev", (_req, res, next) => {
  if (!isDevClerkRelinkAllowed()) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
});

const emailBodySchema = z.object({
  email: z.string().email(),
  dryRun: z.boolean().optional(),
});

// GET /api/dev/clerk-relink/scan
router.get("/dev/clerk-relink/scan", async (req, res): Promise<void> => {
  try {
    assertDevClerkRelinkAllowed();
    const { userId } = getAuth(req);
    const scan = await scanClerkRelinkSituation({ currentClerkUserId: userId });
    console.log(formatRelinkScan(scan));
    res.json(scan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    res.status(500).json({ error: message });
  }
});

// POST /api/dev/clerk-relink/diagnose
router.post("/dev/clerk-relink/diagnose", async (req, res): Promise<void> => {
  try {
    assertDevClerkRelinkAllowed();
    const parsed = emailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { userId } = getAuth(req);
    const diagnosis = await diagnoseClerkRelink({
      email: parsed.data.email,
      currentClerkUserId: userId,
    });

    req.log.info({ diagnosis }, "Clerk relink diagnosis");
    console.log(formatRelinkDiagnosis(diagnosis));

    res.json(diagnosis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Diagnosis failed";
    res.status(500).json({ error: message });
  }
});

// POST /api/dev/clerk-relink/execute
router.post("/dev/clerk-relink/execute", async (req, res): Promise<void> => {
  try {
    assertDevClerkRelinkAllowed();
    const parsed = emailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in so the current Clerk user ID can be used for relink." });
      return;
    }

    const result = await relinkClerkUserByEmail({
      email: parsed.data.email,
      newClerkUserId: userId,
      dryRun: parsed.data.dryRun ?? false,
    });

    req.log.info({ result }, parsed.data.dryRun ? "Clerk relink dry run" : "Clerk relink executed");
    console.log(formatRelinkResult(result));

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Relink failed";
    res.status(400).json({ error: message });
  }
});

export default router;
