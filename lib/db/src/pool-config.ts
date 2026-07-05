function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

/** Parse env as ms; `0` disables optional timeouts (query timeout only). */
function parseTimeoutMs(value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export type DatabasePoolConfig = {
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
  queryTimeoutMs: number;
};

/** Safe defaults for local dev and small beta deployments. Override via env in production. */
export function resolveDatabasePoolConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabasePoolConfig {
  return {
    max: parsePositiveInt(env.DATABASE_POOL_MAX, 10),
    connectionTimeoutMillis: parseTimeoutMs(
      env.DATABASE_CONNECTION_TIMEOUT_MS,
      10_000,
    ),
    idleTimeoutMillis: parseTimeoutMs(env.DATABASE_IDLE_TIMEOUT_MS, 30_000),
    queryTimeoutMs: parseTimeoutMs(env.DATABASE_QUERY_TIMEOUT_MS, 30_000),
  };
}
