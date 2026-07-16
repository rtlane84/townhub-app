/**
 * Prepare a native iOS bundle for staging TestFlight or production App Store.
 *
 * Loads `.env.native.{staging|production}`, runs the native release env gate,
 * then runs `ios:sync` (preflight + Vite build + Capacitor sync).
 *
 * Usage:
 *   node scripts/ios-prepare.mjs staging
 *   node scripts/ios-prepare.mjs production
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2]?.trim();

if (target !== "staging" && target !== "production") {
  console.error("Usage: node scripts/ios-prepare.mjs staging|production");
  process.exit(2);
}

const envFile = join(root, `.env.native.${target}`);
if (!existsSync(envFile)) {
  console.error(`Missing ${envFile}`);
  console.error(`Copy the example and fill values:`);
  console.error(`  cp .env.native.${target}.example .env.native.${target}`);
  process.exit(1);
}

function parseEnvFile(filePath) {
  const env = {};
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const fileEnv = parseEnvFile(envFile);
const childEnv = { ...process.env, ...fileEnv };

function run(command, args, label) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Preparing iOS ${target} bundle from ${envFile}`);

run(
  "pnpm",
  [
    "run",
    "release:check-env",
    "--",
    "--environment",
    target,
    "--component",
    "native",
  ],
  `release:check-env (${target} / native)`,
);

run(
  "pnpm",
  ["--filter", "@workspace/townhub", "run", "ios:sync"],
  "ios:sync",
);

console.log(`\niOS ${target} prepare complete.`);
console.log("Next: bump build if needed, open Xcode, smoke on device, then Product → Archive.");
console.log("  pnpm release:ios:bump-build");
console.log("  pnpm release:ios:open");
