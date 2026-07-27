/**
 * Better Stack JavaScript tag (RUM + session replay + frontend errors).
 *
 * Do not run this alongside a standalone @sentry/react init — Better Stack's
 * tag embeds Sentry and sharing the global instance corrupts both. When the
 * JS token is set, skip VITE_SENTRY_DSN init in sentry.ts.
 *
 * Operator setup: Better Stack → Errors → TownHub Frontend → Frontend tab
 * (or RUM → Connect application) → copy token into VITE_BETTERSTACK_JS_TOKEN.
 */

type BetterStackFn = ((...args: unknown[]) => void) & { q?: unknown[]; l?: number };

declare global {
  interface Window {
    betterstack?: BetterStackFn;
  }
}

const token = import.meta.env.VITE_BETTERSTACK_JS_TOKEN?.trim() ?? "";

export const betterStackJsEnabled = Boolean(token);

function resolveEnvironment(): string {
  return (
    import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT?.trim() ||
    import.meta.env.MODE ||
    "development"
  ).toLowerCase();
}

function resolveRelease(): string | undefined {
  return (
    import.meta.env.VITE_APP_VERSION?.trim() ||
    import.meta.env.VITE_GIT_COMMIT_SHA?.trim() ||
    undefined
  );
}

function installSnippet(applicationToken: string): void {
  const w = window;
  const d = document;
  if (!w.betterstack) {
    const stub: BetterStackFn = (...args: unknown[]) => {
      (stub.q = stub.q || []).push(args);
    };
    stub.l = Date.now();
    w.betterstack = stub;
    const script = d.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://betterstack.net/b.js?t=${encodeURIComponent(applicationToken)}`;
    (d.head || d.getElementsByTagName("head")[0]).appendChild(script);
  }
}

/** Load and init the Better Stack JS tag once at app boot. */
export function initBetterStackJs(): void {
  if (!token || typeof window === "undefined") return;

  installSnippet(token);

  const environment = resolveEnvironment();
  const release = resolveRelease();
  const betterstack = window.betterstack;
  if (!betterstack) return;

  betterstack("config", {
    environment,
    ...(release ? { release } : {}),
  });
  betterstack("init", {
    environment,
    ...(release ? { release } : {}),
  });
}

/** Associate the session with a Clerk user id only — no email/name. */
export function setBetterStackUser(userId: string | null): void {
  if (!betterStackJsEnabled || typeof window === "undefined" || !window.betterstack) {
    return;
  }
  if (userId) {
    window.betterstack("user", { id: userId });
  } else {
    window.betterstack("user", null);
  }
}

export function isBetterStackJsEnabled(): boolean {
  return betterStackJsEnabled;
}
