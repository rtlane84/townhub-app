import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { serializeBusiness } from "./businesses";
import {
  getPrimaryOwnedBusiness,
  listOwnedBusinesses,
  listOwnedBusinessIds,
  requestedBusinessIdFromRequest,
  resolveSelectedOwnedBusiness,
} from "../lib/business-access";
import { resolveSelectedBusinessId } from "../lib/business-selection";
import { ClerkUserDesyncError, ensureDbUserForClerkSession } from "../lib/ensure-db-user";
import { isAdminBootstrapComplete } from "../lib/admin-bootstrap";

const router: IRouter = Router();

function sessionClaims(req: Parameters<typeof getAuth>[0]): Record<string, unknown> | undefined {
  return (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth
    ?.sessionClaims;
}

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let user;
  try {
    user = await ensureDbUserForClerkSession({
      userId,
      sessionClaims: sessionClaims(req),
    });
  } catch (err) {
    if (err instanceof ClerkUserDesyncError) {
      res.status(409).json({
        error: err.message,
        currentClerkUserId: err.currentClerkUserId,
        localUserId: err.localUserId,
        relinkCommand: err.relinkCommand,
      });
      return;
    }
    throw err;
  }

  const ownedIds = await listOwnedBusinessIds(userId);
  const primary = ownedIds.length ? await getPrimaryOwnedBusiness(userId) : null;
  const requestedId = requestedBusinessIdFromRequest(req);
  const selectedId = resolveSelectedBusinessId(ownedIds, requestedId, primary?.id ?? null);

  res.set("Cache-Control", "no-store");
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: selectedId,
    businessIds: ownedIds,
    createdAt: user.createdAt,
  });
});

// GET /api/auth/me/businesses
router.get("/auth/me/businesses", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const businesses = await listOwnedBusinesses(userId);
  res.set("Cache-Control", "no-store");
  res.json(businesses);
});

// GET /api/auth/me/business
router.get("/auth/me/business", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const requestedId = requestedBusinessIdFromRequest(req);
  const business = await resolveSelectedOwnedBusiness(userId, requestedId);

  if (!business) {
    if (requestedId != null) {
      res.status(403).json({ error: "Forbidden: business owner access required" });
      return;
    }
    res.status(404).json({ error: "No business found for this user" });
    return;
  }

  res.set("Cache-Control", "no-store");
  res.json(serializeBusiness(business));
});

// GET /api/admin/bootstrap-status
router.get("/admin/bootstrap-status", async (_req, res): Promise<void> => {
  const setupComplete = await isAdminBootstrapComplete();
  res.set("Cache-Control", "no-store");
  res.json({ setupComplete });
});

// POST /api/admin/bootstrap
// Promotes the calling user to ADMIN — only works when zero admins exist in the DB.
router.post("/admin/bootstrap", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (await isAdminBootstrapComplete()) {
    res.status(403).json({ error: "An admin already exists. Setup is locked." });
    return;
  }

  // Ensure the user row exists
  let user;
  try {
    user = await ensureDbUserForClerkSession({
      userId,
      sessionClaims: sessionClaims(req),
    });
  } catch (err) {
    if (err instanceof ClerkUserDesyncError) {
      res.status(409).json({
        error: err.message,
        currentClerkUserId: err.currentClerkUserId,
        localUserId: err.localUserId,
        relinkCommand: err.relinkCommand,
      });
      return;
    }
    throw err;
  }

  // Promote to ADMIN
  const [updated] = await db
    .update(usersTable)
    .set({ role: "ADMIN" })
    .where(eq(usersTable.id, userId))
    .returning();

  req.log.info({ userId: updated.id }, "Admin bootstrap: user promoted to ADMIN");
  res.json({ message: "Admin access granted. Welcome!", role: updated.role });
});

export default router;
