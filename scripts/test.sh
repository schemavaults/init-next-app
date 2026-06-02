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

echo "==> Installing dependencies"
bun install

echo "==> Building CLI"
bun run build

echo "==> Verifying build output"
test -f dist/index.js
head -1 dist/index.js | grep -q '#!/usr/bin/env node'

echo "==> Scaffolding test app"
node dist/index.js test-app \
  --display-name "Test App" \
  --description "A test project" \
  --client-app-id "00000000-0000-0000-0000-000000000000" \
  --api-server-id "00000000-0000-0000-0000-000000000000" \
  --deployment "$DEPLOYMENT"

echo "==> Asserting scaffolded directory structure"
test -d test-app
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
grep -q 'SCHEMAVAULTS_CLIENT_APP_ID="00000000-0000-0000-0000-000000000000"' test-app/.env.local
grep -q 'SCHEMAVAULTS_API_SERVER_ID="00000000-0000-0000-0000-000000000000"' test-app/.env.local
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

test -f test-app/.env.example

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
grep -q '"next"' test-app/package.json
grep -q '"react"' test-app/package.json
grep -q '"typescript"' test-app/package.json

echo "==> Asserting scaffolded app compiles types"
cd test-app
bun install
bun run typecheck

echo "==> Asserting scaffolded app passes eslint checks"
bun run lint

echo "==> Writing minimal environment variables to get scaffolded app building"
cat >.env.production <<EOL
SCHEMAVAULTS_CLIENT_APP_ID="00000000-0000-0000-0000-000000000000"
SCHEMAVAULTS_API_SERVER_ID="00000000-0000-0000-0000-000000000000"
SCHEMAVAULTS_APP_ENVIRONMENT="production"
EOL

echo "==> Asserting scaffolded app builds"

bun run build
bun run build:migrations

echo "==> All tests passed (--deployment $DEPLOYMENT)"
