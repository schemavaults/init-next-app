#!/usr/bin/env bun
/**
 * Writes `public/openapi.json` from the API catalogue (`src/lib/api/operations.ts`)
 * and checks the catalogue against the route files:
 *
 *   bun run openapi:generate   # (re)write public/openapi.json
 *   bun run openapi:check      # exit 1 if public/openapi.json is stale
 *
 * Every operation exported from a `src/app/api/** /operations.ts` must be in
 * the catalogue, declare the path its directory serves
 * (`src/app/api/items/[id]` <-> `/api/items/{id}`) and have a sibling
 * `route.ts`; every catalogue entry must come from such a file.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertUniqueOperations,
  type AnyOperationDefinition,
} from "@schemavaults/openapi-operations";
import { getOpenApiDocument } from "../src/lib/api/openapi-document";
import { apiOperations } from "../src/lib/api/operations";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(projectRoot, "src", "app");
const apiDir = join(appDir, "api");
const catalogueFile = "src/lib/api/operations.ts";
const outputFile = join(projectRoot, "public", "openapi.json");
const OPERATIONS_FILE = "operations.ts";
const ROUTE_FILE = "route.ts";

const checkOnly = process.argv.includes("--check");

const problems: string[] = [];
function problem(message: string): void {
  problems.push(message);
}

function rel(path: string): string {
  return relative(projectRoot, path).split(sep).join("/");
}

function findOperationFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...findOperationFiles(full));
    else if (entry.name === OPERATIONS_FILE) found.push(full);
  }
  return found.sort();
}

/** Route directory -> OpenAPI path: `(group)` dropped, `[param]` -> `{param}`. */
function expectedPathForDirectory(dir: string): string | null {
  const out: string[] = [];
  for (const segment of relative(appDir, dir).split(sep).filter(Boolean)) {
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (segment.startsWith("[...") || segment.startsWith("[[...")) return null;
    const param = /^\[([^\]]+)\]$/.exec(segment);
    out.push(param ? `{${param[1]}}` : segment);
  }
  return `/${out.join("/")}`;
}

function isOperationDefinition(value: unknown): value is AnyOperationDefinition {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AnyOperationDefinition>;
  return (
    typeof candidate.method === "string" &&
    typeof candidate.path === "string" &&
    typeof candidate.operationId === "string" &&
    typeof candidate.handler === "function"
  );
}

async function checkRouteFiles(): Promise<void> {
  const catalogue = new Map(apiOperations.map((operation) => [operation.operationId, operation]));
  const discovered = new Set<string>();
  const files = findOperationFiles(apiDir);

  if (files.length === 0) {
    problem(`No ${OPERATIONS_FILE} files found under ${rel(apiDir)}/`);
  }

  for (const file of files) {
    const directory = dirname(file);
    const label = rel(file);

    if (!existsSync(join(directory, ROUTE_FILE))) {
      problem(`${label}: no sibling ${ROUTE_FILE} serves these operations`);
    }

    const expectedPath = expectedPathForDirectory(directory);
    if (expectedPath === null) {
      problem(`${label}: catch-all segments cannot be described in OpenAPI; use explicit parameters`);
      continue;
    }

    let mod: Record<string, unknown>;
    try {
      mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
    } catch (error) {
      problem(`${label}: failed to import (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }

    const exported = Object.entries(mod).filter(([, value]) => isOperationDefinition(value)) as Array<
      [string, AnyOperationDefinition]
    >;
    if (exported.length === 0) {
      problem(`${label}: exports no operations (export the result of defineApiOperation())`);
      continue;
    }

    for (const [exportName, operation] of exported) {
      const id = operation.operationId;
      if (operation.path !== expectedPath) {
        problem(
          `${label}: export '${exportName}' (${id}) declares path '${operation.path}' ` +
            `but its directory maps to '${expectedPath}'`,
        );
      }
      if (!catalogue.has(id)) {
        problem(`${label}: export '${exportName}' (${id}) is not listed in ${catalogueFile}`);
      }
      discovered.add(id);
    }
  }

  for (const id of catalogue.keys()) {
    if (!discovered.has(id)) {
      problem(
        `${catalogueFile}: '${id}' is not exported by any src/app/api/**/${OPERATIONS_FILE}; ` +
          `define operations next to the route.ts that serves them`,
      );
    }
  }

  try {
    assertUniqueOperations(apiOperations);
  } catch (error) {
    problem(error instanceof Error ? error.message : String(error));
  }
}

async function main(): Promise<void> {
  await checkRouteFiles();

  if (problems.length > 0) {
    console.error("OpenAPI generation failed:");
    for (const p of problems) console.error(`  - ${p}`);
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
      `${apiOperations.length} operations across ${paths} paths.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
