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

Alongside the `database-migrations` skill above, this project ships with the
`nextjs-docs` Claude Code skill in `.claude/skills/`, which points coding
agents at the version-matched Next.js documentation bundled with the installed
`next` package (`node_modules/next/dist/docs/`).
