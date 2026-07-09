import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Orval emits both a Zod schema and a TS type named ListBusinessOrdersParams.
 * Re-exporting both from @workspace/api-zod causes TS2308. Drop the type-only
 * barrel export; callers use the Zod schema / inferred type from generated/api.
 */
const typesIndex = join(
  dirname(fileURLToPath(import.meta.url)),
  "../api-zod/src/generated/types/index.ts",
);

const before = readFileSync(typesIndex, "utf8");
const after = before.replace(
  /^export \* from '\.\/listBusinessOrdersParams';\n/m,
  "",
);

if (after === before) {
  console.warn("fix-api-zod-type-exports: listBusinessOrdersParams export not found (ok if already fixed)");
} else {
  writeFileSync(typesIndex, after);
  console.log("fix-api-zod-type-exports: removed listBusinessOrdersParams type barrel export");
}
