import { Router, type IRouter } from "express";
import { normalizeUsZipForLookup } from "@workspace/api-zod";
import { lookupUsZip } from "../lib/zip-lookup";

const router: IRouter = Router();

// GET /api/geo/zip/:zip — public US ZIP → city/state lookup
router.get("/geo/zip/:zip", async (req, res): Promise<void> => {
  const raw = typeof req.params.zip === "string" ? req.params.zip : "";
  const zip = normalizeUsZipForLookup(raw);
  if (!zip) {
    res.status(400).json({ error: "Enter a valid 5-digit US ZIP code." });
    return;
  }

  const result = await lookupUsZip(zip);
  if (!result) {
    res.status(404).json({ error: "ZIP code not found." });
    return;
  }

  res.json(result);
});

export default router;
