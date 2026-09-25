#!/usr/bin/env bun
/**
 * Generates `public/openapi.json` (a git-ignored build artifact, served at
 * `/openapi.json`) from the API catalogue (`src/lib/api/operations.ts`):
 *
 *   bun run openapi:generate   # check the route files, then write public/openapi.json
 *   bun run openapi:check      # only check the route files (lint / CI)
 *
 * `bun run dev` and `bun run build` run the generator first, so the file is
 * always fresh and never needs committing. `checkNextAppRouterRoutes()`
 * verifies that every operation exported from a `src/app/api/** /operations.ts`
 * is in the catalogue, declares the path its directory serves
 * (`src/app/api/items/[id]` <-> `/api/items/{id}`) and has a sibling
 * `route.ts`, and that every catalogue entry comes from such a file.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { checkNextAppRouterRoutes } from "@schemavaults/openapi-operations/nextjs/app-router-routes";
import { getOpenApiDocument } from "../src/lib/api/openapi-document";
import { apiOperations } from "../src/lib/api/operations";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDirectory = join(projectRoot, "src", "app");
const outputFile = join(projectRoot, "public", "openapi.json");
const checkOnly = process.argv.includes("--check");

function rel(path: string): string {
  return relative(projectRoot, path).split(sep).join("/");
}

async function main(): Promise<void> {
  const report = await checkNextAppRouterRoutes({
    operations: apiOperations,
    appDirectory,
    catalogueLabel: "src/lib/api/operations.ts",
  });
  if (!report.ok) {
    console.error("API route files and src/lib/api/operations.ts disagree:");
    for (const problem of report.problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const paths = new Set(apiOperations.map((operation) => operation.path)).size;
  const summary = `${apiOperations.length} operations across ${paths} paths (${report.routeFiles.length} route files)`;

  if (checkOnly) {
    console.log(`API route files match the catalogue: ${summary}.`);
    return;
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(getOpenApiDocument(), null, 2)}\n`, "utf8");
  console.log(`Wrote ${rel(outputFile)}: ${summary}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
