import { SignInButton } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { NativeSocialSignInButtons } from "@/components/native-google-sign-in-button";
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
 * Native: Apple/Google native sheets + email via in-app `/sign-in` page
 * (avoids Clerk modal racing with Account drawer / sheets in WKWebView).
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
  const [, setLocation] = useLocation();

  if (native) {
    return (
      <div className={cn("space-y-3", className)}>
        <NativeSocialSignInButtons />
        <Button
          size={size}
          variant={variant}
          className={cn("w-full", buttonClassName)}
          onClick={() => {
            onEmailClick?.();
            setLocation("/sign-in");
          }}
        >
          {children ?? emailLabel ?? label}
        </Button>
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
