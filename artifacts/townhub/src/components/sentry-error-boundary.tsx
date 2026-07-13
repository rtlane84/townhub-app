import type { ReactNode } from "react";
import { ErrorBoundary } from "@sentry/react";
import { Button } from "@/components/ui/button";

function SentryFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-6 py-12">
      <p className="max-w-md text-center text-base text-foreground">
        Something went wrong. Please refresh the page or try again.
      </p>
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
  return <ErrorBoundary fallback={<SentryFallback />}>{children}</ErrorBoundary>;
}
