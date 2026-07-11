import type { ReactNode } from "react";
import { ErrorBoundary } from "@sentry/react";

function SentryFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 py-12">
      <p className="max-w-md text-center text-base text-foreground">
        Something went wrong. Please refresh the page or try again.
      </p>
    </div>
  );
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary fallback={<SentryFallback />}>{children}</ErrorBoundary>;
}
