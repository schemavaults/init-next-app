#!/usr/bin/env bun
/**
 * Writes `public/openapi.json` from the API catalogue (`src/lib/api/operations.ts`)
 * after checking the catalogue against the route files:
 *
 *   bun run openapi:generate   # (re)write public/openapi.json
 *   bun run openapi:check      # exit 1 if public/openapi.json is stale
 *
 * `checkNextAppRouterRoutes()` verifies that every operation exported from a
 * `src/app/api/** /operations.ts` is in the catalogue, declares the path its
 * directory serves (`src/app/api/items/[id]` <-> `/api/items/{id}`) and has
 * a sibling `route.ts`, and that every catalogue entry comes from such a file.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    console.error("OpenAPI generation failed:");
    for (const problem of report.problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const json = `${JSON.stringify(getOpenApiDocument(), null, 2)}\n`;
  const existing = existsSync(outputFile) ? readFileSync(outputFile, "utf8") : null;
  const paths = new Set(apiOperations.map((operation) => operation.path)).size;

  if (checkOnly) {
    if (existing === json) {
      console.log(`${rel(outputFile)} is up to date (${apiOperations.length} operations).`);
      return;
    }
    console.error(
      existing === null ? `${rel(outputFile)} does not exist.` : `${rel(outputFile)} is out of date.`,
    );
    console.error("Run `bun run openapi:generate` and commit the result.");
    process.exit(1);
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, json, "utf8");
  console.log(
    `${existing === json ? "Unchanged" : "Wrote"} ${rel(outputFile)}: ` +
      `${apiOperations.length} operations across ${paths} paths ` +
      `(${report.routeFiles.length} route files checked).`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
