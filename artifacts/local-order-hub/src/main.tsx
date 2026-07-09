import "@/lib/sentry";
import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { initCapacitorShell } from "@/lib/capacitor-shell";
import App from "./App";
import "./index.css";

setBaseUrl(getApiBaseUrl() || null);
initCapacitorShell();

createRoot(document.getElementById("root")!).render(<App />);
