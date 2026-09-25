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

Run linting.

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

## Claude Code Skills

Alongside the `database-migrations` skill above, this project ships with two
more Claude Code skills in `.claude/skills/`:

- `nextjs-docs` points coding agents at the version-matched Next.js
  documentation bundled with the installed `next` package
  (`node_modules/next/dist/docs/`).
- `api-routes` explains how to add API endpoints with
  `@schemavaults/openapi-operations` so they are validated, served by Hono and
  registered in `/openapi.json` and `/docs`.
