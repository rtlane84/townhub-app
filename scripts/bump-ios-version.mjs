/**
 * Bump or set iOS marketing / build versions in the Xcode project.
 *
 * Usage:
 *   node scripts/bump-ios-version.mjs --build
 *   node scripts/bump-ios-version.mjs --marketing 1.0.1
 *   node scripts/bump-ios-version.mjs --build --marketing 1.0.1
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pbxprojPath = join(
  root,
  "artifacts/townhub/ios/App/App.xcodeproj/project.pbxproj",
);

const args = process.argv.slice(2);
let bumpBuild = false;
let marketing = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--build") {
    bumpBuild = true;
    continue;
  }
  if (arg === "--marketing") {
    marketing = args[i + 1];
    i += 1;
    continue;
  }
  if (arg === "--help" || arg === "-h") {
    printUsage();
    process.exit(0);
  }
  console.error(`Unknown argument: ${arg}`);
  printUsage();
  process.exit(2);
}

if (!bumpBuild && marketing == null) {
  printUsage();
  process.exit(2);
}

if (marketing != null && !/^\d+\.\d+(\.\d+)?$/.test(marketing)) {
  console.error(
    `Invalid marketing version "${marketing}". Use semver like 1.0 or 1.0.1.`,
  );
  process.exit(2);
}

let contents = readFileSync(pbxprojPath, "utf8");

const buildMatches = [...contents.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
if (buildMatches.length === 0) {
  console.error("Could not find CURRENT_PROJECT_VERSION in project.pbxproj");
  process.exit(1);
}

const buildValues = new Set(buildMatches.map((match) => match[1]));
if (buildValues.size !== 1) {
  console.error(
    `Inconsistent CURRENT_PROJECT_VERSION values: ${[...buildValues].join(", ")}`,
  );
  process.exit(1);
}

const currentBuild = Number([...buildValues][0]);
const nextBuild = bumpBuild ? currentBuild + 1 : currentBuild;

const marketingMatches = [
  ...contents.matchAll(/MARKETING_VERSION = ([^;]+);/g),
];
if (marketingMatches.length === 0) {
  console.error("Could not find MARKETING_VERSION in project.pbxproj");
  process.exit(1);
}

const marketingValues = new Set(marketingMatches.map((match) => match[1].trim()));
if (marketingValues.size !== 1) {
  console.error(
    `Inconsistent MARKETING_VERSION values: ${[...marketingValues].join(", ")}`,
  );
  process.exit(1);
}

const currentMarketing = [...marketingValues][0];
const nextMarketing = marketing ?? currentMarketing;

if (bumpBuild) {
  contents = contents.replace(
    /CURRENT_PROJECT_VERSION = \d+;/g,
    `CURRENT_PROJECT_VERSION = ${nextBuild};`,
  );
}

if (marketing != null) {
  contents = contents.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${nextMarketing};`,
  );
}

writeFileSync(pbxprojPath, contents);

console.log("iOS version updated:");
console.log(`  MARKETING_VERSION: ${currentMarketing} → ${nextMarketing}`);
console.log(`  CURRENT_PROJECT_VERSION: ${currentBuild} → ${nextBuild}`);
console.log(`  Wrote ${pbxprojPath}`);

function printUsage() {
  console.error("Usage:");
  console.error("  node scripts/bump-ios-version.mjs --build");
  console.error("  node scripts/bump-ios-version.mjs --marketing 1.0.1");
  console.error(
    "  node scripts/bump-ios-version.mjs --build --marketing 1.0.1",
  );
}
