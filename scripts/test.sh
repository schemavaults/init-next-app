#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

DEPLOYMENT="${1:-vercel}"

if [ "$DEPLOYMENT" != "vercel" ] && [ "$DEPLOYMENT" != "none" ]; then
  echo "Usage: $0 [vercel|none]" >&2
  exit 1
fi

echo "==> Running scaffold test with --deployment $DEPLOYMENT"

if [ -d test-app ]; then
  echo "==> Cleaning up existing test-app directory"
  rm -rf test-app
fi
rm -rf tmp

echo "==> Installing dependencies"
bun install

echo "==> Building CLI"
bun run build

echo "==> Verifying build output"
test -f dist/index.js
head -1 dist/index.js | grep -q '#!/usr/bin/env node'

# Run the CLI from the packed tarball rather than the checkout, so anything the
# tarball would omit (the template's .env.local, _gitignore, the hook's
# executable bit) fails here instead of after publishing.
echo "==> Packing the tarball and asserting its contents"
rm -rf tmp/pack && mkdir -p tmp/pack
npm pack --json --pack-destination tmp/pack >tmp/pack/pack.json
node - <<'NODE'
const files = require("./tmp/pack/pack.json")[0].files.map((f) => f.path);
const required = [
  "dist/index.js",
  "templates/schemavaults-next-app/.mouldconfig.json",
  "templates/schemavaults-next-app/.env.local",
  "templates/schemavaults-next-app/.env.example",
  "templates/schemavaults-next-app/_gitignore",
  "templates/schemavaults-next-app/public/.gitkeep",
  "templates/schemavaults-next-app/.claude/hooks/install-deps-in-fresh-environment.sh",
  "templates/schemavaults-next-app/.github/workflows/ci.yml",
  "templates/schemavaults-next-app/vercel.json",
];
const missing = required.filter((f) => !files.includes(f));
const leaked = files.filter((f) => /(^|\/)(node_modules|\.next|dist\/migrations|src\/app\/\(client\)\/auth)\//.test(f) && !f.startsWith("dist/index.js"));
const gitignores = files.filter((f) => /(^|\/)\.(git|npm)ignore$/.test(f));
if (missing.length) { console.error("Missing from tarball:", missing); process.exit(1); }
if (leaked.length) { console.error("Development artefacts leaked into tarball:", leaked); process.exit(1); }
if (gitignores.length) { console.error("Unexpected ignore files in tarball:", gitignores); process.exit(1); }
console.log(`tarball ok: ${files.length} files`);
NODE
tar -xzf tmp/pack/*.tgz -C tmp/pack
CLI="node $(pwd)/tmp/pack/package/dist/index.js"

echo "==> Asserting non-UUID app/api IDs are accepted and invalid IDs are rejected"
if $CLI reject-test-app \
  --display-name "Test App" \
  --description "A test project" \
  --client-app-id "Not A Valid ID!" \
  --api-server-id "test-api-server" \
  --auth-server-url "https://auth.schemavaults.com" \
  --deployment "$DEPLOYMENT" >/dev/null 2>&1; then
  echo "Expected invalid --client-app-id to be rejected" >&2
  exit 1
fi

echo "==> Scaffolding test app"
$CLI test-app \
  --display-name "Test App" \
  --description "A test project" \
  --client-app-id "test-client-app" \
  --api-server-id "test-api-server" \
  --auth-server-url "https://auth.schemavaults.com" \
  --deployment "$DEPLOYMENT"

echo "==> Asserting scaffolded directory structure"
test -d test-app
test ! -e test-app/.mouldconfig.json
test ! -e test-app/_gitignore
test ! -e test-app/.npmignore
test ! -e test-app/public/.gitkeep
test -x test-app/.claude/hooks/install-deps-in-fresh-environment.sh
grep -q 'ignore auth-codegen' test-app/.gitignore

echo "==> Asserting no placeholders or mould markers survived"
if grep -rnE 'xxx_[a-z_]+_xxx' test-app --exclude-dir=node_modules; then
  echo "Expected no leftover placeholders in the scaffolded app" >&2
  exit 1
fi
if grep -rnE 'mould:(if|else|endif)' test-app --exclude-dir=node_modules; then
  echo "Expected no leftover mould marker lines in the scaffolded app" >&2
  exit 1
fi
test -f test-app/package.json
test -f test-app/next.config.ts
test -f test-app/tsconfig.json
test -f test-app/.gitignore
test -f test-app/src/app/layout.tsx
test -f test-app/src/app/not-found.tsx
test -f test-app/src/app/global-error.tsx
test -f test-app/src/app/\(client\)/layout.tsx
test -f test-app/src/app/\(client\)/\(index\)/page.tsx
test -f test-app/src/app/\(client\)/\(index\)/view.tsx
test -f test-app/src/app/\(client\)/home/page.tsx
test -f test-app/src/db/sql.ts
test -f test-app/src/db/migrations/00000-example-migration.ts
test -f test-app/tailwind.config.ts
test -f test-app/postcss.config.cjs
test -d test-app/public
test -f test-app/Dockerfile
test -f test-app/docker-compose.yml
test -f test-app/.dockerignore
test -f test-app/.env.local
grep -q 'SCHEMAVAULTS_CLIENT_APP_ID="test-client-app"' test-app/.env.local
grep -q 'SCHEMAVAULTS_API_SERVER_ID="test-api-server"' test-app/.env.local
grep -q 'SCHEMAVAULTS_AUTH_SERVER_URL="https://auth.schemavaults.com"' test-app/.env.local
grep -q 'ARG SCHEMAVAULTS_AUTH_SERVER_URL="https://auth.schemavaults.com"' test-app/Dockerfile
grep -q 'SCHEMAVAULTS_AUTH_SERVER_URL: https://auth.schemavaults.com' test-app/.github/workflows/ci.yml
test -f test-app/cypress/tsconfig.json
test -f test-app/.github/workflows/ci.yml
test -f test-app/.github/workflows/migrate-production.yml
grep -q 'fix/\*' test-app/.github/workflows/ci.yml
grep -q 'claude/\*' test-app/.github/workflows/ci.yml
grep -q 'feature/\*' test-app/.github/workflows/ci.yml

echo "==> Asserting the @schemavaults/dbh database-migrations Claude skill was installed"
test -d test-app/.claude
test -s test-app/.claude/skills/database-migrations/SKILL.md
grep -q 'name: database-migrations' test-app/.claude/skills/database-migrations/SKILL.md
test -f test-app/skills-lock.json

echo "==> Asserting the nextjs-docs Claude skill was scaffolded"
test -s test-app/.claude/skills/nextjs-docs/SKILL.md
grep -q 'name: nextjs-docs' test-app/.claude/skills/nextjs-docs/SKILL.md
grep -q 'node_modules/next/dist/docs' test-app/.claude/skills/nextjs-docs/SKILL.md

test -f test-app/.env.example
grep -q 'SCHEMAVAULTS_AUTH_SERVER_URL="https://auth.schemavaults.com"' test-app/.env.example

if [ "$DEPLOYMENT" = "vercel" ]; then
  echo "==> Asserting vercel-specific scaffolding"
  test -f test-app/vercel.json
  grep -q '"devCommand"' test-app/vercel.json
  grep -q 'publish-to-vercel' test-app/.github/workflows/ci.yml
  grep -q 'VERCEL_PROJECT_ID=""' test-app/.env.example
  grep -q 'VERCEL_ORG_ID=""' test-app/.env.example
  grep -q 'VERCEL_TOKEN=""' test-app/.env.example
else
  echo "==> Asserting deployment=none scaffolding"
  if [ -f test-app/vercel.json ]; then
    echo "Expected no vercel.json when --deployment none" >&2
    exit 1
  fi
  if grep -q 'publish-to-vercel' test-app/.github/workflows/ci.yml; then
    echo "Expected no publish-to-vercel job when --deployment none" >&2
    exit 1
  fi
  if grep -q 'VERCEL_' test-app/.env.example; then
    echo "Expected no VERCEL_* variables in .env.example when --deployment none" >&2
    exit 1
  fi
fi

echo "==> Asserting scaffolded package.json content"
grep -q '"name": "test-app"' test-app/package.json
grep -q '"description": "A test project"' test-app/package.json
grep -q '"next"' test-app/package.json
grep -q '"react"' test-app/package.json
grep -q '"typescript"' test-app/package.json
grep -q 'POSTGRES_DB: test-app' test-app/docker-compose.yml
grep -q 'container_name: test-app' test-app/docker-compose.yml
grep -q 'Welcome to your new app: Test App' test-app/src/app/\(client\)/\(index\)/view.tsx
grep -q 'Welcome to your new app: Test App' test-app/cypress/e2e/homepage.cy.ts

echo "==> Asserting fetched @schemavaults/* versions were patched in and match the compose image tags"
node - <<'NODE'
const pkg = require("./test-app/package.json");
const compose = require("fs").readFileSync("test-app/docker-compose.yml", "utf8");
const dbh = pkg.dependencies["@schemavaults/dbh"];
const cypress = pkg.devDependencies["cypress"];
if (!/^\d+\.\d+\.\d+/.test(dbh)) { console.error("unexpected dbh version", dbh); process.exit(1); }
if (!compose.includes(`postgres-ws-proxy:${dbh}`)) { console.error("compose ws-proxy tag does not match", dbh); process.exit(1); }
if (!compose.includes(`cypress/included:${cypress}`)) { console.error("compose cypress tag does not match", cypress); process.exit(1); }
NODE
test "$(node -p 'require("./test-app/package.json").dependencies["@schemavaults/dbh"]')" = "$(npm view @schemavaults/dbh version)"

echo "==> Asserting scaffolded app compiles types"
cd test-app
bun install
bun run typecheck

echo "==> Asserting scaffolded app passes eslint checks"
bun run lint

echo "==> Writing minimal environment variables to get scaffolded app building"
cat >.env.production <<EOL
SCHEMAVAULTS_CLIENT_APP_ID="test-client-app"
SCHEMAVAULTS_API_SERVER_ID="test-api-server"
SCHEMAVAULTS_APP_ENVIRONMENT="production"
EOL

echo "==> Asserting scaffolded app builds"

bun run build
bun run build:migrations

echo "==> All tests passed (--deployment $DEPLOYMENT)"
