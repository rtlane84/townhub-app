import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Orval emits both a Zod schema and a TS type with the same name for some
 * request bodies / params. Re-exporting both from @workspace/api-zod causes
 * TS2308. Drop the type-only barrel export; callers use the Zod schema /
 * inferred type from generated/api.
 */
const typesIndex = join(
  dirname(fileURLToPath(import.meta.url)),
  "../api-zod/src/generated/types/index.ts",
);

const CONFLICTING_TYPE_EXPORTS = [
  "listBusinessOrdersParams",
  "rejectEventBody",
  "requestMyAccountDeletionBody",
];

let contents = readFileSync(typesIndex, "utf8");
let changed = false;

for (const name of CONFLICTING_TYPE_EXPORTS) {
  const next = contents.replace(
    new RegExp(`^export \\* from '\\./${name}';\\n`, "m"),
    "",
  );
  if (next !== contents) {
    contents = next;
    changed = true;
    console.log(`fix-api-zod-type-exports: removed ${name} type barrel export`);
  } else {
    console.warn(`fix-api-zod-type-exports: ${name} export not found (ok if already fixed)`);
  }
}

if (changed) {
  writeFileSync(typesIndex, contents);
}
