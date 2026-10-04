# xxx_display_name_xxx

## Getting Started

Install dependencies:

```bash
bun install
```

## Scripts

### Development

```bash
bun run dev
```

Start the development server (runs auth codegen first).

### Build

```bash
bun run build
```

Build the application for production.

### Start

```bash
bun run start
```

Start the production server.

### Lint

```bash
bun run lint
```

Run linting. Besides the usual rules, eslint warns when a file under `src/`
grows past 200 lines and fails past 350 (see the `small-modules` skill).

### Type Check

```bash
bun run typecheck
```

Run TypeScript type checking.

### Auth Codegen

```bash
bun run auth-codegen
```

Generate auth SDK code.

### API routes and OpenAPI

Every endpoint under `src/app/api/` is defined once with
[`@schemavaults/openapi-operations`](https://www.npmjs.com/package/@schemavaults/openapi-operations)
(zod request/response schemas, auth requirements and the handler in one
definition) and served as its own [Hono](https://hono.dev) app from the
Next.js `route.ts` next to it:

- `src/app/api/<path>/operations.ts` — `defineApiOperation()` definitions.
- `src/lib/api/operations.ts` — the catalogue every route file and the OpenAPI
  document are built from.
- `src/app/api/<path>/route.ts` — `export const { GET } = apiRoute([getThing])`.
- [`/openapi.json`](http://localhost:3000/openapi.json) — `public/openapi.json`,
  generated from the catalogue by `bun run dev` / `bun run build` (git-ignored).
- [`/docs`](http://localhost:3000/docs) — the document rendered live by
  [`@schemavaults/openapi-docs-ui`](https://www.npmjs.com/package/@schemavaults/openapi-docs-ui):
  an index of every route plus one page per operation with parameters,
  schemas, auth requirements and a curl example.

```bash
bun run openapi:generate   # check the route files, then write public/openapi.json (dev and build run this)
bun run openapi:check      # only check route files against the catalogue (runs in `bun run lint` and CI)
```

Protected operations accept the SchemaVaults access token as a bearer header
or the first-party cookie; verification (`createSchemaVaultsAuthResolvers()`
from `@schemavaults/auth-server-sdk/openapi-operations`) needs
`SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY` at runtime. Example endpoints
ship in `src/app/api/health`, `src/app/api/greet/[name]` and `src/app/api/me`;
delete them once you have real routes and regenerate. The `api-routes`
Claude Code skill in `.claude/skills/` documents the full workflow.

### Database Migrations

This project ships with the `@schemavaults/dbh` `database-migrations` Claude
Code skill in `.claude/skills/`, which documents how to author, build, validate,
and run migrations. Update it with `npx skills update`.

Build database migrations:

```bash
bun run build:migrations
```

Run migrations for a specific environment:

```bash
bun run migrate:development
bun run migrate:test
bun run migrate:production
```
<!-- mould:if blob_storage == s3 -->

### Blob Storage (S3)

`src/lib/s3.ts` exports a shared
[`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3)
client configured from the `S3_*` environment variables, and the bucket to
use:

```ts
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3Bucket, getS3Client } from "@/lib/s3";

await getS3Client().send(
  new PutObjectCommand({ Bucket: getS3Bucket(), Key: "notes/hello.txt", Body: "Hello!" }),
);
```

In development it talks to the `s3` service in `docker-compose.yml`
([RustFS](https://rustfs.com), an S3-compatible object store), which
`.env.local` is already configured for. Start it before `bun run dev`:

```bash
docker compose up -d --wait s3
```

The `dev-bucket` bucket is created automatically, and objects persist in the
`s3-data` Docker volume (`docker compose down -v` wipes them). Browse them in
the web console at
[http://localhost:9001/rustfs/console/](http://localhost:9001/rustfs/console/) (access key
`s3-dev-access-key`, secret key `s3-dev-secret-key`).

In production, set the `S3_*` variables listed in `.env.example` for AWS S3 or
any S3-compatible provider (Cloudflare R2, Backblaze B2, ...).
<!-- mould:endif -->

## Claude Code Skills

Alongside the `database-migrations` skill above, this project ships with
these Claude Code skills in `.claude/skills/`:

- `nextjs-docs` points coding agents at the version-matched Next.js
  documentation bundled with the installed `next` package
  (`node_modules/next/dist/docs/`).
- `api-routes` explains how to add API endpoints with
  `@schemavaults/openapi-operations` so they are validated, served by Hono and
  registered in `/openapi.json` and `/docs`.
- `commit-changes` has coding agents raise the `package.json` version by
  semver once per branch and run the checks before committing.
- `small-modules` asks agents to keep files under about 200 lines so people
  can review them, and explains how to split them.
- `react19-no-forward-ref` has agents pass refs as regular props instead of
  using `forwardRef`, which React 19 deprecates.
- `react19-use-transition` has agents track pending form submissions with
  `useTransition` and an async function instead of a hand-managed loading
  flag.
<!-- mould:if blob_storage == s3 -->
- `blob-storage` explains how to store and serve files with the S3 client in
  `src/lib/s3.ts`.
<!-- mould:endif -->
