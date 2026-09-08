#!/usr/bin/env bun
/**
 * Generates `public/openapi.json` from every `src/app/api/** /operations.ts`.
 *
 *   bun run openapi:generate   # (re)write public/openapi.json
 *   bun run openapi:check      # exit 1 if public/openapi.json is stale
 *
 * Discovery is by convention: each `operations.ts` exports one or more
 * `defineApiOperation(...)` values and sits next to the `route.ts` that
 * implements them. The script also verifies that every operation's `path`
 * matches its directory (`src/app/api/items/[id]` <-> `/api/items/{id}`) and
 * that operationIds and method+path pairs are unique.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ApiOperation, type AnyApiOperation } from "../src/lib/api/define";
import { buildOpenApiDocument } from "../src/lib/api/openapi-document";
import { openApiInfo } from "../src/lib/api/openapi-info";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appDir = join(projectRoot, "src", "app");
const apiDir = join(appDir, "api");
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
    if (entry.isDirectory()) {
      found.push(...findOperationFiles(full));
    } else if (entry.name === OPERATIONS_FILE) {
      found.push(full);
    }
  }
  return found.sort();
}

/**
 * Map a route directory to the OpenAPI path it serves:
 * route groups `(group)` are dropped, `[param]` becomes `{param}`.
 */
function expectedPathForDirectory(dir: string): string | null {
  const segments = relative(appDir, dir).split(sep).filter(Boolean);
  const out: string[] = [];
  for (const segment of segments) {
    if (segment.startsWith("(") && segment.endsWith(")")) continue;
    if (segment.startsWith("[...") || segment.startsWith("[[...")) return null;
    const param = /^\[([^\]]+)\]$/.exec(segment);
    out.push(param ? `{${param[1]}}` : segment);
  }
  return `/${out.join("/")}`;
}

async function loadOperations(): Promise<AnyApiOperation[]> {
  const operations: AnyApiOperation[] = [];
  const files = findOperationFiles(apiDir);

  if (files.length === 0) {
    problem(`No ${OPERATIONS_FILE} files found under ${rel(apiDir)}/`);
  }

  for (const file of files) {
    const directory = dirname(file);
    const label = rel(file);

    const routeFile = join(directory, ROUTE_FILE);
    if (!existsSync(routeFile)) {
      problem(`${label}: no sibling ${ROUTE_FILE} implements these operations`);
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

    const exported = Object.entries(mod).filter(([, value]) =>
      ApiOperation.isApiOperation(value),
    ) as Array<[string, AnyApiOperation]>;

    if (exported.length === 0) {
      problem(`${label}: exports no operations (export the result of defineApiOperation())`);
      continue;
    }

    for (const [exportName, operation] of exported) {
      if (operation.path !== expectedPath) {
        problem(
          `${label}: export '${exportName}' (${operation.operationId}) declares path '${operation.path}' ` +
            `but its directory maps to '${expectedPath}'`,
        );
      }
      operations.push(operation);
    }
  }

  const byOperationId = new Map<string, number>();
  const byMethodPath = new Map<string, number>();
  for (const operation of operations) {
    byOperationId.set(operation.operationId, (byOperationId.get(operation.operationId) ?? 0) + 1);
    const key = `${operation.method.toUpperCase()} ${operation.path}`;
    byMethodPath.set(key, (byMethodPath.get(key) ?? 0) + 1);
  }
  for (const [id, count] of byOperationId) {
    if (count > 1) problem(`operationId '${id}' is defined ${count} times; operationIds must be unique`);
  }
  for (const [key, count] of byMethodPath) {
    if (count > 1) problem(`${key} is defined ${count} times`);
  }

  return operations;
}

async function main(): Promise<void> {
  const operations = await loadOperations();

  if (problems.length > 0) {
    console.error("OpenAPI generation failed:");
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  const document = buildOpenApiDocument(operations, openApiInfo);
  const json = `${JSON.stringify(document, null, 2)}\n`;
  const existing = existsSync(outputFile) ? readFileSync(outputFile, "utf8") : null;

  if (checkOnly) {
    if (existing === json) {
      console.log(`${rel(outputFile)} is up to date (${operations.length} operations).`);
      return;
    }
    console.error(
      existing === null
        ? `${rel(outputFile)} does not exist.`
        : `${rel(outputFile)} is out of date.`,
    );
    console.error("Run `bun run openapi:generate` and commit the result.");
    process.exit(1);
  }

  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, json, "utf8");
  console.log(
    `${existing === json ? "Unchanged" : "Wrote"} ${rel(outputFile)}: ` +
      `${operations.length} operations from ${new Set(operations.map((o) => o.path)).size} paths.`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
