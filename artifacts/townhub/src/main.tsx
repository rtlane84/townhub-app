import "@/lib/sentry";
import { initPlausible } from "@/lib/plausible";
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { initCapacitorShell } from "@/lib/capacitor-shell";
import { promoteNativeSsoPathParamsToSearch } from "@/lib/native-oauth";
import { isNativeApp } from "@/lib/native-platform";
import { initializeNativeClerkTokenTransport } from "@/lib/native-clerk-token-transport";
import App from "./App";
import "./index.css";

// Path-encoded SSO remounts promote into ?search before Clerk boots.
promoteNativeSsoPathParamsToSearch();

initPlausible();

const apiBaseUrl = getApiBaseUrl();
setBaseUrl(apiBaseUrl || null);

if (isNativeApp() && !apiBaseUrl) {
  console.error(
    "[TownHub] Native build is missing VITE_API_BASE_URL. Re-run ios:sync after sourcing .env.native.staging.",
  );
}

async function bootstrap(): Promise<void> {
  await initializeNativeClerkTokenTransport();
  initCapacitorShell();
  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
