import { useEffect, useRef, useState } from "react";
import { useAuth, useClerk } from "@clerk/react";
import { useLocation } from "wouter";
import { LoadingButton } from "@/components/ui/loading-button";
import { clearNativeOAuthPending } from "@/lib/native-oauth-resume";
import { consumePostAuthRedirect } from "@/lib/native-post-auth-redirect";

type FinishState =
  | { kind: "working" }
  | { kind: "error"; message: string; detail: string };

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const withErrors = err as {
      errors?: Array<{ longMessage?: string; message?: string }>;
      message?: string;
      longMessage?: string;
    };
    const first = withErrors.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
    if (withErrors.longMessage) return withErrors.longMessage;
    if (withErrors.message) return withErrors.message;
  }
  return err instanceof Error ? err.message : "Sign-in could not be finished.";
}

function readCallbackParams(): {
  search: string;
  nonce: string | null;
  status: string | null;
} {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const fromSearch = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const fromHash = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return {
    search,
    nonce: fromSearch.get("rotating_token_nonce") ?? fromHash.get("rotating_token_nonce"),
    status: fromSearch.get("__clerk_status") ?? fromHash.get("__clerk_status"),
  };
}

/**
 * Completes Safari → townhub:// OAuth inside the Capacitor WebView.
 * Surfaces Clerk errors instead of force-redirecting home while signed out.
 */
export function NativeSsoFinish() {
  const { handleRedirectCallback, loaded } = useClerk();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [redirectUrl] = useState(() => consumePostAuthRedirect("/"));
  const [state, setState] = useState<FinishState>({ kind: "working" });
  const signedInRef = useRef(false);

  useEffect(() => {
    clearNativeOAuthPending();
  }, []);

  useEffect(() => {
    signedInRef.current = Boolean(isSignedIn);
    if (authLoaded && isSignedIn) {
      setLocation(redirectUrl);
    }
  }, [authLoaded, isSignedIn, redirectUrl, setLocation]);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;
    let settleTimer = 0;

    void (async () => {
      const params = readCallbackParams();
      if (!params.nonce && !params.status && !params.search) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: "Sign-in return was missing Clerk parameters.",
            detail:
              "The app opened /sso-callback without rotating_token_nonce. Confirm Cap Browser showed “Returning to TownHub…”, Clerk allowlists include townhub://oauth/sso-callback, and staging bounce path-encodes params into townhub://oauth/sso-callback/p/…",
          });
        }
        return;
      }

      try {
        await handleRedirectCallback({
          continueSignUpUrl: "/sign-up",
          signInFallbackRedirectUrl: redirectUrl,
          signUpFallbackRedirectUrl: redirectUrl,
        });
        settleTimer = window.setTimeout(() => {
          if (cancelled || signedInRef.current) return;
          setState({
            kind: "error",
            message: "Sign-in finished but no session was created.",
            detail: [
              params.nonce ? "nonce=present" : "nonce=missing",
              params.status ? `status=${params.status}` : "status=missing",
              `search=${params.search || "(empty)"}`,
            ].join(" · "),
          });
        }, 2500);
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: clerkErrorMessage(err),
            detail: [
              params.nonce ? "nonce=present" : "nonce=missing",
              params.status ? `status=${params.status}` : "status=missing",
              `search=${params.search || "(empty)"}`,
            ].join(" · "),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, [handleRedirectCallback, loaded, redirectUrl]);

  if (state.kind === "error") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-4 py-12 text-center">
        <p className="text-sm font-medium text-destructive">{state.message}</p>
        <p className="max-w-sm break-words text-xs text-muted-foreground">{state.detail}</p>
        <LoadingButton type="button" onClick={() => setLocation("/")}>
          Back to home
        </LoadingButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
    </div>
  );
}
