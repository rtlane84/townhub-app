export interface ClerkFapiRequest {
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  method?: string;
  path?: string;
  url?: URL;
}

export interface ClerkFapiResponse extends Response {
  payload?: unknown;
}

export function applyNativeClerkRequestAuth(
  request: ClerkFapiRequest,
  token: string | null,
): void {
  request.credentials = "omit";
  request.url?.searchParams.set("_is_native", "1");

  if (!token) return;
  const headers = new Headers(request.headers);
  headers.set("authorization", token);
  request.headers = headers;
}

export function rotatedClerkClientToken(response?: ClerkFapiResponse): string | null {
  const token = response?.headers.get("authorization")?.trim();
  return token || null;
}
