import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, accountDeletionRequestsTable } from "@workspace/db";
import { eq, count, and, sql, desc } from "drizzle-orm";
import { serializeBusiness } from "./businesses";
import { getPlatformTimeZone } from "../lib/platform-timezone";
import {
  getPrimaryOwnedBusiness,
  listOwnedBusinesses,
  listOwnedBusinessIds,
  requestedBusinessIdFromRequest,
  resolveSelectedOwnedBusiness,
} from "../lib/business-access";
import { resolveSelectedBusinessId } from "../lib/business-selection";
import { ClerkUserDesyncError, ensureDbUserForClerkSession } from "../lib/ensure-db-user";
import { CLERK_USER_DESYNC_PUBLIC_RESPONSE } from "../lib/clerk-user-desync-public";
import { isAdminBootstrapComplete } from "../lib/admin-bootstrap";
import { respondIfUserDisabled } from "../lib/user-account-status";
import { RequestMyAccountDeletionBody } from "@workspace/api-zod";

const router: IRouter = Router();

function sessionClaims(req: Parameters<typeof getAuth>[0]): Record<string, unknown> | undefined {
  return (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth
    ?.sessionClaims;
}

function serializeAccountDeletionRequest(
  request: typeof accountDeletionRequestsTable.$inferSelect,
) {
  return {
    id: request.id,
    status: request.status,
    requestedAt: request.requestedAt,
    scheduledFor: request.scheduledFor,
    canceledAt: request.canceledAt,
    completedAt: request.completedAt,
    updatedAt: request.updatedAt,
  };
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
      res.status(409).json(CLERK_USER_DESYNC_PUBLIC_RESPONSE);
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
    status: user.status,
    businessId: selectedId,
    businessIds: ownedIds,
    createdAt: user.createdAt,
  });
});

// GET /api/auth/account-deletion
router.get("/auth/account-deletion", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await ensureDbUserForClerkSession({ userId, sessionClaims: sessionClaims(req) });
  const [request] = await db
    .select()
    .from(accountDeletionRequestsTable)
    .where(eq(accountDeletionRequestsTable.userId, userId))
    .limit(1);

  res.set("Cache-Control", "no-store");
  res.json({ request: request ? serializeAccountDeletionRequest(request) : null });
});

// POST /api/auth/account-deletion
router.post("/auth/account-deletion", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = RequestMyAccountDeletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Type DELETE to confirm this request." });
    return;
  }

  const user = await ensureDbUserForClerkSession({
    userId,
    sessionClaims: sessionClaims(req),
  });
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const [request] = await db
    .insert(accountDeletionRequestsTable)
    .values({
      userId,
      emailSnapshot: user.email,
      status: "REQUESTED",
      requestedAt: now,
      scheduledFor,
    })
    .onConflictDoUpdate({
      target: accountDeletionRequestsTable.userId,
      set: {
        emailSnapshot: user.email,
        status: "REQUESTED",
        requestedAt: now,
        scheduledFor,
        canceledAt: null,
        completedAt: null,
        updatedAt: now,
      },
    })
    .returning();

  req.log.warn({ userId, requestId: request.id }, "Account deletion requested");
  res.set("Cache-Control", "no-store");
  res.json(serializeAccountDeletionRequest(request));
});

// DELETE /api/auth/account-deletion
router.delete("/auth/account-deletion", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await ensureDbUserForClerkSession({ userId, sessionClaims: sessionClaims(req) });
  const now = new Date();
  const [request] = await db
    .update(accountDeletionRequestsTable)
    .set({ status: "CANCELED", canceledAt: now, updatedAt: now })
    .where(
      and(
        eq(accountDeletionRequestsTable.userId, userId),
        eq(accountDeletionRequestsTable.status, "REQUESTED"),
      ),
    )
    .returning();

  if (!request) {
    res.status(404).json({ error: "No pending deletion request found." });
    return;
  }

  req.log.info({ userId, requestId: request.id }, "Account deletion request canceled");
  res.set("Cache-Control", "no-store");
  res.json(serializeAccountDeletionRequest(request));
});

// GET /api/admin/account-deletion-requests (guarded by routes/index.ts)
router.get("/admin/account-deletion-requests", async (_req, res): Promise<void> => {
  const requests = await db
    .select({
      request: accountDeletionRequestsTable,
      userId: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(accountDeletionRequestsTable)
    .innerJoin(usersTable, eq(usersTable.id, accountDeletionRequestsTable.userId))
    .orderBy(desc(accountDeletionRequestsTable.requestedAt));

  res.set("Cache-Control", "no-store");
  res.json(
    requests.map(({ request, userId, email, role }) => ({
      ...serializeAccountDeletionRequest(request),
      userId,
      email,
      role,
    })),
  );
});

// GET /api/auth/me/businesses
router.get("/auth/me/businesses", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [user] = await db
    .select({ status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (respondIfUserDisabled(user.status, res)) {
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

  const [user] = await db
    .select({ status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (respondIfUserDisabled(user.status, res)) {
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
  res.json(serializeBusiness(business, { timeZone: await getPlatformTimeZone() }));
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

  const bootstrapToken = process.env.BOOTSTRAP_TOKEN?.trim();
  if (bootstrapToken) {
    const provided =
      (typeof req.body?.token === "string" ? req.body.token.trim() : "") ||
      (typeof req.get("X-Bootstrap-Token") === "string" ? req.get("X-Bootstrap-Token")!.trim() : "");
    if (provided !== bootstrapToken) {
      res.status(403).json({ error: "Invalid bootstrap token." });
      return;
    }
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
      res.status(409).json(CLERK_USER_DESYNC_PUBLIC_RESPONSE);
      return;
    }
    throw err;
  }

  // Promote to ADMIN only when no admin exists yet (atomic guard against bootstrap races).
  const [updated] = await db
    .update(usersTable)
    .set({ role: "ADMIN" })
    .where(
      and(
        eq(usersTable.id, userId),
        sql`(SELECT COUNT(*)::int FROM ${usersTable} WHERE ${usersTable.role} = 'ADMIN') = 0`,
      ),
    )
    .returning();

  if (!updated) {
    res.status(403).json({ error: "An admin already exists. Setup is locked." });
    return;
  }

  req.log.info({ userId: updated.id }, "Admin bootstrap: user promoted to ADMIN");
  res.json({ message: "Admin access granted. Welcome!", role: updated.role });
});

export default router;
