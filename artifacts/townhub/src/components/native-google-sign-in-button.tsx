import { useState } from "react";
import { useClerk } from "@clerk/react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { useLocation } from "wouter";
import { LoadingButton } from "@/components/ui/loading-button";
import { Apple } from "lucide-react";
import { isIOS } from "@/lib/native-platform";
import { AuthSession } from "@/lib/native-auth-session";
import { consumePostAuthRedirect, rememberPostAuthRedirect } from "@/lib/native-post-auth-redirect";

function nativeErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const withCode = err as { code?: string; message?: string; longMessage?: string };
    if (withCode.code === "AUTH_CANCELLED") return "Sign-in cancelled.";
    if (withCode.longMessage) return withCode.longMessage;
    const clerkErr = err as {
      errors?: Array<{ longMessage?: string; message?: string; code?: string }>;
    };
    const first = clerkErr.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
    if (withCode.message) return withCode.message;
  }
  return err instanceof Error ? err.message : "Sign-in failed";
}

function isCancelled(err: unknown): boolean {
  return Boolean(
    err && typeof err === "object" && (err as { code?: string }).code === "AUTH_CANCELLED",
  );
}

/** Clerk requires a nonce on the Apple identity token for oauth_token_apple. */
function createAppleNonce(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function googleClientConfig(): { clientId: string; serverClientId: string } | null {
  const clientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID?.trim() ?? "";
  const serverClientId = import.meta.env.VITE_GOOGLE_SERVER_CLIENT_ID?.trim() ?? "";
  if (!clientId || !serverClientId) return null;
  return { clientId, serverClientId };
}

/**
 * Native Apple sign-in for the Capacitor app.
 *
 * Uses Apple's native `ASAuthorization` sheet (no browser, no redirect) to get
 * an identity token, then exchanges it with Clerk via the `oauth_token_apple`
 * strategy. Missing the nonce causes Clerk to reject with "not authorized".
 */
export function NativeAppleSignInButton({ className }: { className?: string }) {
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isIOS()) return null;

  async function signInWithApple() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      if (!signInLoaded || !signUpLoaded || !signIn || !signUp || !setActive) {
        setError("Sign-in is still loading. Try again in a moment.");
        return;
      }

      rememberPostAuthRedirect();

      const nonce = createAppleNonce();
      const { identityToken } = await AuthSession.appleSignIn({ nonce });
      if (!identityToken) {
        setError("Apple did not return a sign-in token. Try again.");
        return;
      }

      let createdSessionId: string | null = null;

      await signIn.create({
        strategy: "oauth_token_apple",
        token: identityToken,
      });

      if (signIn.status === "complete") {
        createdSessionId = signIn.createdSessionId;
      } else if (signIn.firstFactorVerification?.status === "transferable") {
        await signUp.create({ transfer: true });
        if (signUp.status === "complete") {
          createdSessionId = signUp.createdSessionId;
        }
      }

      if (!createdSessionId) {
        setError("Could not complete Apple sign-in. Try email instead.");
        return;
      }

      await setActive({ session: createdSessionId });
      setLocation(consumePostAuthRedirect("/"));
    } catch (err) {
      if (isCancelled(err)) {
        setError(null);
        return;
      }
      setError(nativeErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <LoadingButton
        type="button"
        variant="outline"
        className="w-full min-h-11 bg-black text-white border-black hover:bg-black/85 hover:text-white"
        loading={pending}
        onClick={() => void signInWithApple()}
      >
        <Apple className="mr-2 h-4 w-4" aria-hidden="true" />
        Continue with Apple
      </LoadingButton>
      {error ? <p className="mt-2 text-xs text-destructive text-center">{error}</p> : null}
    </div>
  );
}

/**
 * Native Google Sign-In for the Capacitor iOS app.
 *
 * GIDSignIn returns an ID token whose audience is the Web client
 * (`serverClientId`). Clerk verifies it with `authenticateWithGoogleOneTap`.
 * Requires Google Cloud iOS + Web OAuth clients and Clerk Google custom credentials.
 */
export function NativeGoogleSignInButton({
  className,
  label = "Continue with Google",
}: {
  className?: string;
  label?: string;
}) {
  const clerk = useClerk();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isIOS()) return null;

  const googleConfig = googleClientConfig();

  async function signInWithGoogle() {
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      if (!googleConfig) {
        setError(
          "Google Sign-In is not configured for this build. Add VITE_GOOGLE_IOS_CLIENT_ID and VITE_GOOGLE_SERVER_CLIENT_ID, then rebuild.",
        );
        return;
      }

      rememberPostAuthRedirect();

      const { idToken } = await AuthSession.googleSignIn({
        clientId: googleConfig.clientId,
        serverClientId: googleConfig.serverClientId,
      });
      if (!idToken) {
        setError("Google did not return a sign-in token. Try again.");
        return;
      }

      const signInOrUp = await clerk.authenticateWithGoogleOneTap({ token: idToken });
      const createdSessionId = signInOrUp.createdSessionId;
      if (!createdSessionId) {
        setError("Could not complete Google sign-in. Try Apple or email instead.");
        return;
      }

      await clerk.setActive({ session: createdSessionId });
      setLocation(consumePostAuthRedirect("/"));
    } catch (err) {
      if (isCancelled(err)) {
        setError(null);
        return;
      }
      setError(nativeErrorMessage(err));
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
        onClick={() => void signInWithGoogle()}
      >
        {label}
      </LoadingButton>
      {error ? <p className="mt-2 text-xs text-destructive text-center">{error}</p> : null}
    </div>
  );
}

export function NativeSocialSignInButtons({ className }: { className?: string }) {
  if (!isIOS()) return null;

  return (
    <div className={className}>
      <div className="space-y-3">
        <NativeAppleSignInButton />
        <NativeGoogleSignInButton />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        Uses Apple or Google on this device. No password needed.
      </p>
    </div>
  );
}
