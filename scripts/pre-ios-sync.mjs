/**
 * Fail fast before Vite bundles a native iOS app with missing or dev-only env.
 * Run with native staging/production vars exported (e.g. source .env.native.staging).
 */
const errors = [];
const value = (name) => process.env[name]?.trim() ?? "";

function requireHttps(name) {
  const configured = value(name);
  if (!configured) return;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") {
      errors.push(`${name} must use HTTPS (got ${configured})`);
    }
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      errors.push(`${name} must not target localhost`);
    }
  } catch {
    errors.push(`${name} must be a valid absolute URL`);
  }
}

for (const name of [
  "VITE_API_BASE_URL",
  "VITE_PUBLIC_WEB_URL",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_SENTRY_DSN",
]) {
  if (!value(name)) {
    errors.push(`${name} is required — source .env.native.staging before ios:sync`);
  }
}

if (value("VITE_DISTRIBUTION_CHANNEL") !== "app-store") {
  errors.push("VITE_DISTRIBUTION_CHANNEL must equal app-store for ios:sync");
}

requireHttps("VITE_API_BASE_URL");
requireHttps("VITE_PUBLIC_WEB_URL");

const proxy = value("VITE_CLERK_PROXY_URL");
if (proxy) {
  errors.push(
    "VITE_CLERK_PROXY_URL must be unset for native builds — remove it from .env.native.staging (Clerk loads from CDN on device)",
  );
}

if (errors.length > 0) {
  console.error("Native iOS build preflight failed:");
  for (const error of errors) console.error(`- ${error}`);
  console.error("");
  console.error("Example:");
  console.error("  set -a && source .env.native.staging && set +a");
  console.error("  pnpm --filter @workspace/townhub run ios:sync");
  process.exit(1);
}

console.log("Native iOS build preflight passed.");
