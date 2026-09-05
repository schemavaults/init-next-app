#!/usr/bin/env bash
# The template under templates/ is a real Next.js app: it must install,
# type-check and lint on its own (that is the whole point of keeping it as
# files), and its .mouldconfig.json must stay in sync with the files.
set -euo pipefail

cd "$(dirname "$0")/.."
TEMPLATE_DIR="templates/schemavaults-next-app"

echo "==> Asserting .mouldconfig.json and template files agree"
node - "$TEMPLATE_DIR" <<'NODE'
const { readFileSync, readdirSync, statSync, existsSync } = require("fs");
const { join } = require("path");

const dir = process.argv[2];
const config = JSON.parse(readFileSync(join(dir, ".mouldconfig.json"), "utf8"));

// Development artefacts, never template content
const skipDirs = new Set(["node_modules", ".next", "dist", "postgres-data"]);
const skipPaths = new Set(["src/app/(client)/auth", "bun.lock", "next-env.d.ts"]);

function walk(base, rel = "") {
  const out = [];
  for (const entry of readdirSync(join(base, rel))) {
    const relPath = rel ? `${rel}/${entry}` : entry;
    if (skipDirs.has(entry) || skipPaths.has(relPath)) continue;
    if (statSync(join(base, relPath)).isDirectory()) out.push(...walk(base, relPath));
    else out.push(relPath);
  }
  return out;
}

const files = walk(dir).filter((f) => f !== ".mouldconfig.json" && !f.endsWith(".gitkeep"));
const contents = new Map(files.map((f) => [f, readFileSync(join(dir, f), "utf8")]));
const inputIds = new Set(config.inputs.map((i) => i.id));
let failed = false;
const fail = (msg) => { console.error(`  x ${msg}`); failed = true; };

// every substitution references a declared input and occurs somewhere
for (const sub of config.substitutions) {
  const find = Array.isArray(sub) ? sub[0] : sub.find;
  const input = Array.isArray(sub) ? sub[1] : sub.input;
  if (!inputIds.has(input)) fail(`substitution '${find}' references undeclared input '${input}'`);
  if (![...contents.values()].some((c) => c.includes(find))) fail(`substitution '${find}' occurs in no template file`);
}

// every xxx_..._xxx token in the tree is a declared substitution
const declared = new Set(config.substitutions.map((s) => (Array.isArray(s) ? s[0] : s.find)));
for (const [file, text] of contents) {
  for (const token of text.match(/xxx_[a-z_]+_xxx/g) ?? []) {
    if (!declared.has(token)) fail(`${file}: placeholder '${token}' is not declared in .mouldconfig.json`);
  }
}

// every renames key exists
for (const key of Object.keys(config.renames ?? {})) {
  if (!existsSync(join(dir, key))) fail(`renames key '${key}' does not exist in the template`);
}

// the docker-compose image tags are inputs; their package.json counterparts must exist
const pkg = JSON.parse(contents.get("package.json"));
if (!pkg.devDependencies?.cypress) fail("package.json has no devDependencies.cypress (the docker-compose cypress tag is derived from it)");
if (!pkg.dependencies?.["@schemavaults/dbh"]) fail("package.json has no dependencies['@schemavaults/dbh']");

// a .gitignore in the template would be renamed by npm when packing
if (existsSync(join(dir, ".gitignore"))) fail("template must not contain a .gitignore (store it as _gitignore)");
if (existsSync(join(dir, ".npmignore"))) fail("template must not contain a .npmignore");

// the Claude hook must be executable
const hook = join(dir, ".claude/hooks/install-deps-in-fresh-environment.sh");
if ((statSync(hook).mode & 0o111) === 0) fail("install-deps-in-fresh-environment.sh is not executable");

if (failed) process.exit(1);
console.log(`  ok: ${files.length} template files, ${config.substitutions.length} substitutions, ${config.inputs.length} inputs`);
NODE

cd "$TEMPLATE_DIR"

echo "==> Installing template dependencies"
bun install

echo "==> Type-checking the template (runs auth-codegen and next typegen first)"
bun run typecheck

echo "==> Linting the template"
bun run lint

echo "==> Template checks passed"
