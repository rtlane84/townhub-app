import { useState, type FormEvent } from "react";
import { useSignIn, useSignUp } from "@clerk/react/legacy";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { consumePostAuthRedirect } from "@/lib/native-post-auth-redirect";
import { cn } from "@/lib/utils";

function clerkErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    const clerkErr = err as {
      errors?: Array<{ longMessage?: string; message?: string }>;
      message?: string;
    };
    const first = clerkErr.errors?.[0];
    if (first?.longMessage) return first.longMessage;
    if (first?.message) return first.message;
    if (clerkErr.message) return clerkErr.message;
  }
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}

/**
 * Custom email/password sign-in for Capacitor.
 *
 * Native Clerk uses `standardBrowser: false`, which does not load prebuilt UI
 * components — so `<SignIn />` throws "Clerk was not loaded with Ui components".
 * Hooks (`useSignIn`) still work, same as Apple/Google token exchange.
 */
export function NativeEmailSignInForm({ className }: { className?: string }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setLocation(consumePostAuthRedirect() ?? "/");
        return;
      }
      setError(
        "Additional verification is required. Try Apple or Google, or complete sign-in on the website.",
      );
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className={cn("space-y-3 rounded-[1.25rem] border border-black/[0.05] bg-card p-4 shadow-sm", className)}
      data-testid="native-email-sign-in"
    >
      <div>
        <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
          Sign in with email
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use the email and password for your TownHub account.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="native-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="native-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending || !isLoaded}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="native-password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="native-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending || !isLoaded}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <LoadingButton
        type="submit"
        className="w-full min-h-[48px]"
        loading={pending}
        disabled={!isLoaded || !email.trim() || !password}
        loadingText="Signing in…"
      >
        Sign in
      </LoadingButton>
      <p className="text-center text-sm text-muted-foreground">
        Need an account?{" "}
        <Link href="/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}

/**
 * Custom email/password sign-up + email code verification for Capacitor.
 * Same reason as NativeEmailSignInForm: no Clerk prebuilt UI on native.
 */
export function NativeEmailSignUpForm({ className }: { className?: string }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp || pending) return;
    setPending(true);
    setError(null);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp || pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        setLocation(consumePostAuthRedirect() ?? "/");
        return;
      }
      setError("Could not verify that code. Check your email and try again.");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  if (pendingVerification) {
    return (
      <form
        onSubmit={(e) => void onVerify(e)}
        className={cn("space-y-3 rounded-[1.25rem] border border-black/[0.05] bg-card p-4 shadow-sm", className)}
        data-testid="native-email-verify"
      >
        <div>
          <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the verification code we sent to {email.trim() || "your email"}.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="native-verify-code" className="text-sm font-medium">
            Verification code
          </label>
          <Input
            id="native-verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            disabled={pending}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <LoadingButton
          type="submit"
          className="w-full min-h-[48px]"
          loading={pending}
          disabled={!code.trim()}
          loadingText="Verifying…"
        >
          Verify and continue
        </LoadingButton>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={pending}
          onClick={() => {
            setPendingVerification(false);
            setCode("");
            setError(null);
          }}
        >
          Back
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => void onCreate(e)}
      className={cn("space-y-3 rounded-[1.25rem] border border-black/[0.05] bg-card p-4 shadow-sm", className)}
      data-testid="native-email-sign-up"
    >
      <div>
        <h1 className="font-serif text-xl font-semibold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign up with email and a password. We’ll send a verification code.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="native-signup-email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="native-signup-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending || !isLoaded}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="native-signup-password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="native-signup-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={pending || !isLoaded}
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <LoadingButton
        type="submit"
        className="w-full min-h-[48px]"
        loading={pending}
        disabled={!isLoaded || !email.trim() || password.length < 8}
        loadingText="Creating account…"
      >
        Continue
      </LoadingButton>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
