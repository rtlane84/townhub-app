import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorBoundary } from "@sentry/react";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/native-platform";
import { isSentryEnabled } from "@/lib/sentry";

function FallbackUi({ error, componentStack }: { error: unknown; componentStack: string }) {
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

type LocalBoundaryState = {
  error: unknown | null;
  componentStack: string;
};

class LocalErrorBoundary extends Component<{ children: ReactNode }, LocalBoundaryState> {
  state: LocalBoundaryState = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: unknown): Partial<LocalBoundaryState> {
    return { error, componentStack: "" };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.setState({ error, componentStack: info.componentStack ?? "" });
  }

  render() {
    if (this.state.error != null) {
      return (
        <FallbackUi error={this.state.error} componentStack={this.state.componentStack} />
      );
    }
    return this.props.children;
  }
}

export function SentryErrorBoundary({ children }: { children: ReactNode }) {
  if (!isSentryEnabled()) {
    return <LocalErrorBoundary>{children}</LocalErrorBoundary>;
  }

  return (
    <ErrorBoundary
      fallback={({ error, componentStack }) => (
        <FallbackUi error={error} componentStack={componentStack ?? ""} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
