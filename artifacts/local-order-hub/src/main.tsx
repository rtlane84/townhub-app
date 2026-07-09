import "@/lib/sentry";
import { createRoot } from "react-dom/client";
import { initCapacitorShell } from "@/lib/capacitor-shell";
import App from "./App";
import "./index.css";

initCapacitorShell();

createRoot(document.getElementById("root")!).render(<App />);
