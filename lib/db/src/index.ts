import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import { resolveDatabasePoolConfig } from "./pool-config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConfig = resolveDatabasePoolConfig();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: poolConfig.max,
  connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
  idleTimeoutMillis: poolConfig.idleTimeoutMillis,
});

pool.on("error", (error) => {
  console.error("[db] Unexpected idle client error on pool", error);
});

pool.on("connect", (client) => {
  if (poolConfig.queryTimeoutMs <= 0) return;
  client
    .query(`SET statement_timeout = '${poolConfig.queryTimeoutMs}ms'`)
    .catch((error) => {
      console.error("[db] Failed to set statement_timeout on new connection", error);
    });
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export { resolveDatabasePoolConfig } from "./pool-config";
export type { DatabasePoolConfig } from "./pool-config";
