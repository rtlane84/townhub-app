function errorCause(error: object): unknown {
  return (error as { cause?: unknown }).cause;
}

export function hasDatabaseErrorCode(error: unknown, expectedCode: string): boolean {
  const visited = new Set<object>();
  let current = error;

  while (current && typeof current === "object" && !visited.has(current)) {
    visited.add(current);
    if ((current as { code?: unknown }).code === expectedCode) return true;
    current = errorCause(current);
  }

  return false;
}

export function isPostgresUniqueViolation(error: unknown): boolean {
  return hasDatabaseErrorCode(error, "23505");
}
