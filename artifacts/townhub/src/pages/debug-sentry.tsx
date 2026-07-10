/**
 * Dev-only route that throws a test error for Sentry verification.
 * Registered only when import.meta.env.DEV is true.
 */
export default function DebugSentryPage(): never {
  throw new Error("Sentry Test");
}
