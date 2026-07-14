const args = new Map();
const commandArgs = process.argv.slice(2).filter((argument) => argument !== "--");
for (let index = 0; index < commandArgs.length; index += 2) {
  args.set(commandArgs[index], commandArgs[index + 1]);
}

const environment = args.get("--environment");
const component = args.get("--component");
const validEnvironments = new Set(["staging", "production"]);
const validComponents = new Set(["api", "frontend", "native"]);

if (!validEnvironments.has(environment) || !validComponents.has(component)) {
  console.error(
    "Usage: node scripts/validate-release-env.mjs --environment staging|production --component api|frontend|native",
  );
  process.exit(2);
}

const errors = [];
const value = (name) => process.env[name]?.trim() ?? "";

function requireVariables(names) {
  for (const name of names) {
    if (!value(name)) errors.push(`${name} is required`);
  }
}

function requireHttps(name) {
  const configured = value(name);
  if (!configured) return;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS`);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      errors.push(`${name} must not target localhost`);
    }
  } catch {
    errors.push(`${name} must be a valid absolute URL`);
  }
}

if (value("DEPLOYMENT_ENVIRONMENT") !== environment) {
  errors.push(`DEPLOYMENT_ENVIRONMENT must equal ${environment}`);
}

if (component === "api") {
  requireVariables([
    "DATABASE_URL",
    "CLERK_SECRET_KEY",
    "CLERK_PUBLISHABLE_KEY",
    "SESSION_SECRET",
    "APP_BASE_URL",
    "NATIVE_ALLOWED_ORIGINS",
    "STRIPE_SECRET_KEY",
    "STRIPE_CONNECT_WEBHOOK_SECRET",
    "STRIPE_PLATFORM_WEBHOOK_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_STORAGE_BUCKET",
    "RESEND_API_KEY",
    "RESEND_FROM",
    "SENTRY_DSN",
    "JOB_SECRET",
    "PLATFORM_ADMIN_EMAIL",
  ]);
  if (value("NODE_ENV") !== "production") errors.push("NODE_ENV must equal production");
  if (value("SESSION_SECRET").length < 32) errors.push("SESSION_SECRET must be at least 32 characters");
  if (!value("NATIVE_ALLOWED_ORIGINS").split(",").map((item) => item.trim()).includes("capacitor://localhost")) {
    errors.push("NATIVE_ALLOWED_ORIGINS must include capacitor://localhost");
  }
  if (environment === "production" && !value("STRIPE_SECRET_KEY").startsWith("sk_live_")) {
    errors.push("Production STRIPE_SECRET_KEY must be a live-mode key");
  }
  if (environment === "staging" && !value("STRIPE_SECRET_KEY").startsWith("sk_test_")) {
    errors.push("Staging STRIPE_SECRET_KEY must be a test-mode key");
  }
  requireHttps("APP_BASE_URL");
}

if (component === "frontend") {
  requireVariables([
    "VITE_CLERK_PUBLISHABLE_KEY",
    "VITE_API_BASE_URL",
    "VITE_SENTRY_DSN",
  ]);
  if (value("VITE_DISTRIBUTION_CHANNEL") !== "web") {
    errors.push("VITE_DISTRIBUTION_CHANNEL must equal web for browser deployments");
  }
  requireHttps("VITE_API_BASE_URL");
}

if (component === "native") {
  requireVariables([
    "VITE_CLERK_PUBLISHABLE_KEY",
    "VITE_API_BASE_URL",
    "VITE_PUBLIC_WEB_URL",
    "VITE_SENTRY_DSN",
  ]);
  if (value("VITE_DISTRIBUTION_CHANNEL") !== "app-store") {
    errors.push("VITE_DISTRIBUTION_CHANNEL must equal app-store for the iOS release bundle");
  }
  requireHttps("VITE_API_BASE_URL");
  requireHttps("VITE_PUBLIC_WEB_URL");
}

if (environment === "production") {
  for (const name of ["APP_BASE_URL", "VITE_API_BASE_URL", "VITE_PUBLIC_WEB_URL"]) {
    if (/staging|stage|test/i.test(value(name))) {
      errors.push(`${name} appears to target a non-production host`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Release environment check failed for ${environment}/${component}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Release environment check passed for ${environment}/${component}.`);
