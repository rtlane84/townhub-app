import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const includeBundle = process.argv.includes("--bundle");
const entryBundleBudgetBytes = 1_000_000;
const oversizedSourceLines = 800;

function gitFiles(): string[] {
  const output = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: workspaceRoot, encoding: "utf8" },
  );
  return output.trim().split("\n").filter(Boolean);
}

function lineCount(path: string): number {
  const text = readFileSync(path, "utf8");
  return text === "" ? 0 : text.split(/\r?\n/).length;
}

function normalizedMarkdownTarget(rawTarget: string): string | null {
  const target = rawTarget.trim();
  if (/^(?:https?:|mailto:|tel:|#)/i.test(target)) return null;
  const withoutWrapper = target.startsWith("<")
    ? target.slice(1, target.indexOf(">"))
    : target.split(/\s+["']/)[0];
  const pathOnly = withoutWrapper.split("#")[0];
  if (!pathOnly) return null;
  try {
    return decodeURIComponent(pathOnly);
  } catch {
    return pathOnly;
  }
}

function relativeMarkdownLinkFailures(files: string[]): string[] {
  const failures: string[] = [];
  for (const file of files.filter((candidate) => candidate.endsWith(".md"))) {
    const absoluteFile = join(workspaceRoot, file);
    if (!existsSync(absoluteFile)) continue;
    const source = readFileSync(absoluteFile, "utf8");
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = normalizedMarkdownTarget(match[1]);
      if (!target) continue;
      const absoluteTarget = resolve(dirname(absoluteFile), target);
      if (!existsSync(absoluteTarget)) {
        failures.push(`${file}: missing ${match[1]}`);
      }
    }
  }
  return failures;
}

function largestEntryBundle(): { path: string; bytes: number } | null {
  const assetsDir = join(
    workspaceRoot,
    "artifacts/townhub/dist/public/assets",
  );
  if (!existsSync(assetsDir)) return null;

  const candidates = readdirSync(assetsDir)
    .filter((file) => /^index-[^.]+\.js$/.test(file))
    .map((file) => {
      const path = join(assetsDir, file);
      return { path, bytes: statSync(path).size };
    })
    .sort((left, right) => right.bytes - left.bytes);
  return candidates[0] ?? null;
}

const files = gitFiles();
const hardFailures: string[] = [];
const forbiddenTrackedPrefixes = [
  ".pnpm-store/",
  "node_modules/",
  "playwright-report/",
  "test-results/",
];
const forbiddenTrackedSegments = ["/dist/", "/build/", "/DerivedData/", "/Pods/"];

for (const file of files) {
  if (
    forbiddenTrackedPrefixes.some((prefix) => file.startsWith(prefix)) ||
    forbiddenTrackedSegments.some((segment) => file.includes(segment))
  ) {
    hardFailures.push(`generated/cache path is tracked: ${file}`);
  }
}

hardFailures.push(...relativeMarkdownLinkFailures(files));

const sourceFiles = files.filter((file) => {
  if (!file.startsWith("artifacts/") && !file.startsWith("lib/")) return false;
  if (file.includes("/generated/")) return false;
  return [".ts", ".tsx"].includes(extname(file));
});
const hotspots = sourceFiles
  .map((file) => ({ file, lines: lineCount(join(workspaceRoot, file)) }))
  .filter(({ lines }) => lines >= oversizedSourceLines)
  .sort((left, right) => right.lines - left.lines);

const productionBasenames = new Set(
  files
    .filter((file) => file.startsWith("artifacts/townhub/src/"))
    .map((file) => file.split("/").at(-1)!),
);
const mockupOverlap = files
  .filter((file) => file.startsWith("artifacts/mockup-sandbox/src/"))
  .filter((file) => productionBasenames.has(file.split("/").at(-1)!));

console.log(`Tracked/source-visible files: ${files.length}`);
console.log(`TypeScript source files checked: ${sourceFiles.length}`);
console.log(`Oversized source hotspots (>= ${oversizedSourceLines} lines): ${hotspots.length}`);
for (const hotspot of hotspots) {
  console.log(`  ${hotspot.lines} ${hotspot.file}`);
}
console.log(`Mockup files sharing production basenames: ${mockupOverlap.length}`);

if (includeBundle) {
  const bundle = largestEntryBundle();
  if (!bundle) {
    hardFailures.push("frontend bundle not found; run the TownHub build first");
  } else {
    const displayPath = relative(workspaceRoot, bundle.path);
    console.log(`Largest entry bundle: ${bundle.bytes} bytes (${displayPath})`);
    if (bundle.bytes > entryBundleBudgetBytes) {
      hardFailures.push(
        `entry bundle ${bundle.bytes} bytes exceeds ${entryBundleBudgetBytes}-byte budget`,
      );
    }
  }
}

if (hardFailures.length > 0) {
  console.error("Codebase health check failed:");
  for (const failure of hardFailures.slice(0, 50)) {
    console.error(`  - ${failure}`);
  }
  if (hardFailures.length > 50) {
    console.error(`  - ...and ${hardFailures.length - 50} more`);
  }
  process.exitCode = 1;
} else {
  console.log("Codebase health check passed.");
}
