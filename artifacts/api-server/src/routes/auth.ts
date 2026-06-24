import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, businessesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { serializeBusiness } from "./businesses";

const router: IRouter = Router();

// GET /api/auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    // Auto-create user on first auth
    const claims = (req as unknown as { auth?: { sessionClaims?: Record<string, unknown> } })?.auth?.sessionClaims;
    const email = (claims?.email as string) ?? `${userId}@user.local`;
    const name = (claims?.name as string) ?? null;
    const [created] = await db
      .insert(usersTable)
      .values({ id: userId, email, name, role: "CUSTOMER" })
      .returning();
    user = created;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, userId));

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    businessId: business?.id ?? null,
    createdAt: user.createdAt,
  });
});

// GET /api/auth/me/business
router.get("/auth/me/business", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [business] = await db
    .select()
    .from(businessesTable)
    .where(eq(businessesTable.ownerId, userId));

  if (!business) {
    res.status(404).json({ error: "No business found for this user" });
    return;
  }

  res.json(serializeBusiness(business));
});

export default router;
