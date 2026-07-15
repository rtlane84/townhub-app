import type { ReactNode } from "react";
import { ErrorBoundary } from "@sentry/react";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native-platform";

function SentryFallback({ error, componentStack }: { error: unknown; componentStack: string }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error";

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 py-12">
      <p className="max-w-md text-center text-base text-foreground">
        Something went wrong. Please refresh the page or try again.
      </p>
      {isNativeApp() ? (
        <p className="max-w-md break-words text-center text-xs text-muted-foreground">
          {message}
          {componentStack ? `\n${componentStack.split("\n").slice(0, 4).join("\n")}` : ""}
        </p>
      ) : null}
      <Button
        type="button"
        className="rounded-full"
        onClick={() => window.location.reload()}
      >
        Refresh
      </Button>
    </div>
  );
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error, componentStack }) => (
        <SentryFallback error={error} componentStack={componentStack ?? ""} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
