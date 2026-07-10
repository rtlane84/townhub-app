import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { Browser } from "@capacitor/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import { isNativeApp } from "@/lib/native-platform";
import { getNativeSsoHttpsCallbackUrl } from "@/lib/native-oauth";
import { markNativeOAuthPending } from "@/lib/native-oauth-resume";

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const withMessage = err as { message?: string; longMessage?: string };
    if (withMessage.longMessage) return withMessage.longMessage;
    if (withMessage.message) return withMessage.message;

    const clerkErr = err as {
      errors?: Array<{ longMessage?: string; message?: string }>;
    };
    const first = clerkErr.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
  }
  return err instanceof Error ? err.message : "Google sign-in failed";
}

/**
 * Native-only Google OAuth.
 *
 * Google blocks OAuth inside WKWebView (Error 403: disallowed_useragent).
 * Clerk also rejects custom-scheme redirect_url (invalid_url_scheme).
 *
 * Flow:
 * 1. Create SignIn with oauth_google + https://{app}/native-sso-callback
 * 2. Open externalVerificationRedirectURL in Safari
 * 3. Clerk redirects to HTTPS /native-sso-callback in Safari
 * 4. That page bounces to townhub://sso-callback → WebView finishes session on /sso-callback
 */
export function NativeGoogleSignInButton({
  className,
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}) {
  const { signIn, fetchStatus } = useSignIn();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNativeApp()) return null;

  const ready = Boolean(signIn) && fetchStatus !== "fetching";

  async function startGoogleOAuth() {
    if (!signIn || !ready || pending) return;
    setPending(true);
    setError(null);

    try {
      const callbackUrl = getNativeSsoHttpsCallbackUrl();
      const { error: createError } = await signIn.create({
        strategy: "oauth_google",
        redirectUrl: callbackUrl,
        actionCompleteRedirectUrl: callbackUrl,
      });

      if (createError) {
        setError(clerkErrorMessage(createError));
        return;
      }

      const verificationUrl =
        signIn.firstFactorVerification?.externalVerificationRedirectURL?.toString() ??
        null;

      if (!verificationUrl) {
        setError("Could not start Google sign-in. Try email instead, or try again.");
        return;
      }

      markNativeOAuthPending();
      await Browser.open({ url: verificationUrl });
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <LoadingButton
        type="button"
        variant="outline"
        className="w-full min-h-11 bg-white text-foreground border-border"
        loading={pending}
        disabled={!ready}
        onClick={() => void startGoogleOAuth()}
      >
        {label}
      </LoadingButton>
      {error ? <p className="mt-2 text-xs text-destructive text-center">{error}</p> : null}
      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Opens Safari to sign in securely, then returns to TownHub.
      </p>
    </div>
  );
}
