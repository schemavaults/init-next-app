#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
bun install

echo "==> Building CLI"
bun run build

echo "==> Verifying build output"
test -f dist/index.js
head -1 dist/index.js | grep -q '#!/usr/bin/env node'

echo "==> Scaffolding test app"
rm -rf test-app
node dist/index.js test-app --display-name "Test App" --description "A test project"

echo "==> Asserting scaffolded directory structure"
test -d test-app
test -f test-app/package.json
test -f test-app/next.config.ts
test -f test-app/tsconfig.json
test -f test-app/.gitignore
test -f test-app/src/app/layout.tsx
test -f test-app/src/app/page.tsx
test -f test-app/src/db/sql.ts
test -f test-app/src/db/migrations/00000-example-migration.ts
test -f test-app/tailwind.config.ts
test -f test-app/postcss.config.cjs
test -d test-app/public

echo "==> Asserting scaffolded package.json content"
grep -q '"name": "test-app"' test-app/package.json
grep -q '"next"' test-app/package.json
grep -q '"react"' test-app/package.json
grep -q '"typescript"' test-app/package.json

echo "==> Asserting scaffolded app compiles with TypeScript"
cd test-app
bun install
bunx tsc --noEmit

echo "==> All tests passed"
