import { init } from "@plausible-analytics/tracker";

const PRODUCTION_DOMAIN = "townhub.io";

/** Init Plausible only on production web builds (townhub.io), not staging or local. */
export function initPlausible(): void {
  if (typeof window === "undefined") return;

  const deploymentEnvironment =
    import.meta.env.VITE_DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase() ?? "";
  if (deploymentEnvironment !== "production") return;

  init({
    domain: PRODUCTION_DOMAIN,
    autoCapturePageviews: true,
    outboundLinks: true,
    fileDownloads: true,
    formSubmissions: true,
    // Keep window.plausible so Plausible's verify tool can detect the install.
    bindToWindow: true,
  });
}
