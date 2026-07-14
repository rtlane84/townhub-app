import { SignInButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { NativeSocialSignInButtons } from "@/components/native-google-sign-in-button";
import { nativeClerkAuthAppearance } from "@/lib/clerk-appearance";
import { isNativeApp } from "@/lib/native-platform";
import { cn } from "@/lib/utils";

type NativeAwareSignInProps = {
  /** Label for the primary web CTA / native email CTA. */
  label: string;
  /** Optional native-only email button label (defaults to label). */
  emailLabel?: string;
  className?: string;
  buttonClassName?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  children?: React.ReactNode;
  onEmailClick?: () => void;
};

/**
 * Web: Clerk modal with Google + email.
 * Native: Safari Apple/Google OAuth + email-only Clerk modal.
 * Clerk’s in-WebView Google button triggers Google’s “access blocked” policy error.
 */
export function NativeAwareSignIn({
  label,
  emailLabel,
  className,
  buttonClassName,
  size = "default",
  variant = "default",
  children,
  onEmailClick,
}: NativeAwareSignInProps) {
  const native = isNativeApp();

  if (native) {
    return (
      <div className={cn("space-y-3", className)}>
        <NativeSocialSignInButtons />
        <SignInButton mode="modal" appearance={nativeClerkAuthAppearance}>
          <Button
            size={size}
            variant={variant}
            className={cn("w-full", buttonClassName)}
            onClick={onEmailClick}
          >
            {children ?? emailLabel ?? label}
          </Button>
        </SignInButton>
      </div>
    );
  }

  return (
    <SignInButton mode="modal">
      <Button size={size} variant={variant} className={cn("w-full", buttonClassName)} onClick={onEmailClick}>
        {children ?? label}
      </Button>
    </SignInButton>
  );
}
