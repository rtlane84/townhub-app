import "@/lib/sentry";
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { initCapacitorShell } from "@/lib/capacitor-shell";
import { isNativeApp } from "@/lib/native-platform";
import App from "./App";
import "./index.css";

const apiBaseUrl = getApiBaseUrl();
setBaseUrl(apiBaseUrl || null);

if (isNativeApp() && !apiBaseUrl) {
  console.error(
    "[TownHub] Native build is missing VITE_API_BASE_URL. Re-run ios:sync after sourcing .env.native.staging.",
  );
}

initCapacitorShell();

createRoot(document.getElementById("root")!).render(<App />);
