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

Every endpoint under `src/app/api/` is its own [Hono](https://hono.dev) app,
defined with zod schemas via
[`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi)
so requests are validated at runtime and documented automatically:

- `src/app/api/<path>/operations.ts` — `defineApiOperation()` definitions
  (method, path, schemas, access level, responses).
- `src/app/api/<path>/route.ts` — `createApiRoute(operation.implement(handler), …)`
  exports the Next.js `GET`/`POST`/… handlers.
- `public/openapi.json` — generated from every `operations.ts`; served at
  [`/openapi.json`](http://localhost:3000/openapi.json) and rendered at
  [`/docs`](http://localhost:3000/docs) without any external UI dependency.

```bash
bun run openapi:generate   # rewrite public/openapi.json (also runs on `bun run dev`)
bun run openapi:check      # fail if it is stale (runs in `bun run lint` and CI)
```

Example endpoints ship in `src/app/api/health`, `src/app/api/greet/[name]`
and `src/app/api/me`; delete them once you have real routes and regenerate.
The `api-routes` Claude Code skill in `.claude/skills/` documents the full
workflow for coding agents.

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
- `api-routes` explains how to add API endpoints that are validated with zod,
  served by Hono and registered in `public/openapi.json` / `/docs`.
