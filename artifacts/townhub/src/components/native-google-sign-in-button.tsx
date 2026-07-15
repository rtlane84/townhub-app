import { useState } from "react";
import { useSignIn } from "@clerk/react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Apple } from "lucide-react";
import { isNativeApp } from "@/lib/native-platform";
import { getNativeBundledOrigin, NATIVE_SSO_CALLBACK_PATH } from "@/lib/native-oauth";
import { rememberPostAuthRedirect } from "@/lib/native-post-auth-redirect";

function clerkErrorMessage(err: unknown, provider: "Apple" | "Google"): string {
  if (err && typeof err === "object") {
    const withCode = err as { code?: string; message?: string; longMessage?: string };
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

/** Google rejects embedded web views; surface a clear fallback on iOS. */
function googleWebViewHint(message: string, provider: "Apple" | "Google"): string | null {
  if (provider !== "Google") return null;
  if (/disallowed_useragent|user.?agent|403|not.*allowed/i.test(message)) {
    return "Google blocks sign-in inside app web views. Use Apple or email on iOS.";
  }
  return null;
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
      rememberPostAuthRedirect();

      // In-WebView web OAuth: the WebView follows the provider redirect chain
      // and Clerk finishes the session on capacitor://localhost via its handshake
      // (AuthenticateWithRedirectCallback at /sso-callback). No external browser
      // or custom-scheme nonce — that path is incompatible with the web SDK.
      const origin = getNativeBundledOrigin(window.location.origin);
      const { error: ssoError } = await signIn.sso({
        strategy,
        redirectUrl: `${origin}/`,
        redirectCallbackUrl: `${origin}${NATIVE_SSO_CALLBACK_PATH}`,
      });
      // sso() navigates away on success; only reachable if it returned an error.
      if (ssoError) {
        const message = clerkErrorMessage(ssoError, provider);
        setError(googleWebViewHint(message, provider) ?? message);
        setPending(false);
      }
    } catch (err) {
      const message = clerkErrorMessage(err, provider);
      setError(googleWebViewHint(message, provider) ?? message);
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
 * Native Apple / Google OAuth via the web Clerk SDK, in the Capacitor WebView.
 *
 * Flow:
 * 1. signIn.authenticateWithRedirect navigates the WKWebView to the provider.
 * 2. Provider → Clerk FAPI → back to capacitor://localhost/sso-callback.
 * 3. AuthenticateWithRedirectCallback completes the session via Clerk's handshake
 *    (capacitor://localhost is an allowed origin on the instance).
 *
 * Apple works inside WKWebView; Google blocks embedded web views
 * (disallowed_useragent) and surfaces a fallback message on iOS.
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
