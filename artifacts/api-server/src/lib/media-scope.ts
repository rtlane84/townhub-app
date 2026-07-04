export type ResolvedMediaScope =
  | { kind: "business"; businessId: number }
  | { kind: "platform" };

/**
 * Resolves which business (or platform) media belongs to for an upload/list request.
 * Business owners must pass an explicit businessId they own.
 */
export function resolveOwnerMediaBusinessId(input: {
  role: string;
  ownedBusinessIds: number[];
  requestedBusinessId?: number | null;
}): ResolvedMediaScope | null {
  if (input.role === "ADMIN") {
    if (input.requestedBusinessId != null) {
      return { kind: "business", businessId: input.requestedBusinessId };
    }
    return { kind: "platform" };
  }

  if (input.role === "BUSINESS_OWNER") {
    if (input.requestedBusinessId == null) return null;
    if (!input.ownedBusinessIds.includes(input.requestedBusinessId)) return null;
    return { kind: "business", businessId: input.requestedBusinessId };
  }

  return null;
}

export function mediaScopeToBusinessId(scope: ResolvedMediaScope): number | null {
  return scope.kind === "business" ? scope.businessId : null;
}
