import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { Browser } from "@capacitor/browser";
import { LoadingButton } from "@/components/ui/loading-button";
import { Apple } from "lucide-react";
import { isNativeApp } from "@/lib/native-platform";
import { getNativeSsoHttpsCallbackUrl } from "@/lib/native-oauth";
import { markNativeOAuthPending } from "@/lib/native-oauth-resume";
import { rememberPostAuthRedirect } from "@/lib/native-post-auth-redirect";

function clerkErrorMessage(err: unknown, provider: "Apple" | "Google"): string {
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
  return err instanceof Error ? err.message : `${provider} sign-in failed`;
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
      const callbackUrl = getNativeSsoHttpsCallbackUrl();
      const { error: createError } = await signIn.create({
        strategy,
        redirectUrl: callbackUrl,
        actionCompleteRedirectUrl: callbackUrl,
      });

      if (createError) {
        setError(clerkErrorMessage(createError, provider));
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

      // Google blocks WKWebView (disallowed_useragent) → Cap Browser + townhub:// bounce.
      // Apple works in-WebView; keep the full redirect chain inside Capacitor so
      // /native-sso-callback can return via capacitor://localhost/sso-callback?params
      // (Cap Browser / SFSafariViewController often drops custom-scheme query params).
      if (provider === "Google") {
        await Browser.open({ url: verificationUrl });
      } else {
        window.location.assign(verificationUrl);
      }
    } catch (err) {
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
