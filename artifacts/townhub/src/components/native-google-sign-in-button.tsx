import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { AuthSession } from "@/lib/native-auth-session";
import { LoadingButton } from "@/components/ui/loading-button";
import { Apple } from "lucide-react";
import { isNativeApp } from "@/lib/native-platform";
import {
  getNativeBundledOrigin,
  getNativeOAuthRedirectUrl,
  NATIVE_OAUTH_SCHEME,
  describeNativeAuthReturnUrl,
  nativeSsoDeepLinkHasParams,
  resolveNativeDeepLinkToAppUrl,
} from "@/lib/native-oauth";
import {
  clearNativeOAuthPending,
  markNativeAuthSessionHandled,
  markNativeOAuthPending,
  rememberNativeAuthReturnShape,
} from "@/lib/native-oauth-resume";
import { rememberPostAuthRedirect } from "@/lib/native-post-auth-redirect";
import { skipNativeSplashOnNextLoad } from "@/lib/native-splash-session";

function clerkErrorMessage(err: unknown, provider: "Apple" | "Google"): string {
  if (err && typeof err === "object") {
    const withCode = err as { code?: string; message?: string; longMessage?: string };
    if (withCode.code === "AUTH_CANCELLED") {
      return "Sign-in cancelled.";
    }
    if (withCode.longMessage) return withCode.longMessage;
    if (withCode.message) return withCode.message;

    const clerkErr = err as {
      errors?: Array<{ longMessage?: string; message?: string }>;
    };
    const first = clerkErr.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  return err instanceof Error ? err.message : `${provider} sign-in failed`;
}

function isAuthCancelled(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      (err as { code?: string }).code === "AUTH_CANCELLED",
  );
}

type NativeSocialProvider = {
  label: string;
  provider: "Apple" | "Google";
  strategy: "oauth_apple" | "oauth_google";
};

function NativeSocialSignInButton({
  className,
  label,
  provider,
  strategy,
}: NativeSocialProvider & { className?: string }) {
  const { signIn, fetchStatus } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNativeApp()) return null;

  const ready = Boolean(signIn) && fetchStatus !== "fetching";

  async function startOAuth() {
    if (!signIn || !ready || pending) return;
    setPending(true);
    setError(null);

    try {
      // Custom scheme — Clerk attaches rotating_token_nonce only for allowlisted
      // native redirect URLs. HTTPS bounce alone lands without a transfer nonce
      // (browser cookies stay in AuthSession, Cap WebView stays signed out).
      const callbackUrl = getNativeOAuthRedirectUrl();
      const { error: createError } = await signIn.create({
        strategy,
        redirectUrl: callbackUrl,
        actionCompleteRedirectUrl: callbackUrl,
      });

      if (createError) {
        const message = clerkErrorMessage(createError, provider);
        if (/invalid_url_scheme|redirect_url|not (allowed|whitelisted)/i.test(message)) {
          setError(
            `${message} Add ${callbackUrl} under Clerk → Native applications / Redirect URLs (staging instance).`,
          );
        } else {
          setError(message);
        }
        return;
      }

      const verificationUrl =
        signIn.firstFactorVerification?.externalVerificationRedirectURL?.toString() ?? null;

      if (!verificationUrl) {
        setError(`Could not start ${provider} sign-in. Try email instead, or try again.`);
        return;
      }

      markNativeOAuthPending();
      rememberPostAuthRedirect();

      // Cap Browser (SFSafariViewController) blanks on appleid.apple.com and
      // cannot return custom-scheme OAuth callbacks. ASWebAuthenticationSession
      // intercepts townhub:// from the HTTPS bounce with the full URL.
      const { url: returnedUrl } = await AuthSession.openAuthSession({
        url: verificationUrl,
        callbackScheme: NATIVE_OAUTH_SCHEME,
        prefersEphemeralSession: false,
      });

      rememberNativeAuthReturnShape(describeNativeAuthReturnUrl(returnedUrl));

      if (!nativeSsoDeepLinkHasParams(returnedUrl)) {
        clearNativeOAuthPending();
        setError(
          `Sign-in returned without Clerk parameters (${describeNativeAuthReturnUrl(returnedUrl)}). Add ${getNativeOAuthRedirectUrl()} to Clerk Redirect URLs on the staging instance, then try again.`,
        );
        return;
      }

      // Block Cap's racing bare townhub:// appUrlOpen from wiping params.
      markNativeAuthSessionHandled();
      clearNativeOAuthPending();
      skipNativeSplashOnNextLoad();
      const next = resolveNativeDeepLinkToAppUrl(
        returnedUrl,
        getNativeBundledOrigin(window.location.origin),
      );
      window.location.assign(next);
    } catch (err) {
      clearNativeOAuthPending();
      if (isAuthCancelled(err)) {
        setError(null);
        return;
      }
      setError(clerkErrorMessage(err, provider));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <LoadingButton
        type="button"
        variant="outline"
        className={
          provider === "Apple"
            ? "w-full min-h-11 bg-black text-white border-black hover:bg-black/85 hover:text-white"
            : "w-full min-h-11 bg-white text-foreground border-border"
        }
        loading={pending}
        disabled={!ready}
        onClick={() => void startOAuth()}
      >
        {provider === "Apple" ? <Apple className="mr-2 h-4 w-4" aria-hidden="true" /> : null}
        {label}
      </LoadingButton>
      {error ? <p className="mt-2 text-xs text-destructive text-center">{error}</p> : null}
    </div>
  );
}

/**
 * Native Apple / Google OAuth via ASWebAuthenticationSession.
 *
 * Flow:
 * 1. Create SignIn with oauth_* + redirectUrl=townhub://oauth/sso-callback
 * 2. Open Clerk verification URL in ASWebAuthenticationSession
 * 3. Clerk → provider → townhub://oauth/sso-callback?rotating_token_nonce=…
 * 4. Auth session resolves with that URL
 * 5. Remount capacitor://localhost/sso-callback/p/… and finish the session
 */
export function NativeGoogleSignInButton({
  className,
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <NativeSocialSignInButton
      className={className}
      label={label}
      provider="Google"
      strategy="oauth_google"
    />
  );
}

export function NativeAppleSignInButton({ className }: { className?: string }) {
  return (
    <NativeSocialSignInButton
      className={className}
      label="Continue with Apple"
      provider="Apple"
      strategy="oauth_apple"
    />
  );
}

export function NativeSocialSignInButtons({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-3">
        <NativeAppleSignInButton />
        <NativeGoogleSignInButton />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Opens a secure sign-in page, then returns to TownHub.
      </p>
    </div>
  );
}
