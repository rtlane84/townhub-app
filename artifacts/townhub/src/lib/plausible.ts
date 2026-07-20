const PLAUSIBLE_SCRIPT_SRC = "https://plausible.io/js/pa-QspO1x-1P0rzKko6jqTXY.js";

declare global {
  interface Window {
    plausible?: {
      (...args: unknown[]): void;
      q?: unknown[][];
      init?: (options?: Record<string, unknown>) => void;
      o?: Record<string, unknown>;
    };
  }
}

/** Load Plausible only on production web builds (townhub.io), not staging or local dev. */
export function initPlausible(): void {
  if (typeof document === "undefined") return;

  const deploymentEnvironment =
    import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase() ?? "";
  if (deploymentEnvironment !== "production") return;

  if (document.querySelector(`script[src="${PLAUSIBLE_SCRIPT_SRC}"]`)) return;

  window.plausible =
    window.plausible ||
    function (...args: unknown[]) {
      (window.plausible!.q = window.plausible!.q || []).push(args);
    };
  window.plausible.init =
    window.plausible.init ||
    function (options?: Record<string, unknown>) {
      window.plausible!.o = options || {};
    };
  window.plausible.init();

  const script = document.createElement("script");
  script.async = true;
  script.src = PLAUSIBLE_SCRIPT_SRC;
  document.head.appendChild(script);
}
