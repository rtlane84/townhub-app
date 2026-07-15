/** Coerce React Query / fetch payloads into a real array (preserves element type). */
export function asArray<T>(value: readonly T[] | null | undefined): T[];
export function asArray<T = never>(value: unknown): T[];
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
