# @schemavaults/init-next-app

A CLI tool for scaffolding out a new Next.js application with [@schemavaults/auth](https://github.com/schemavaults/auth), [@schemavaults/theme](https://github.com/schemavaults/theme), and [@schemavaults/dbh](https://github.com/schemavaults/dbh) configured.

When initializing a project, the CLI also installs the [@schemavaults/dbh](https://github.com/schemavaults/dbh) `database-migrations` Claude Code skill into the new project's `.claude/skills/` (via `npx skills add`), so coding agents know how to author migrations in the format this template scaffolds.

## Usage

Use the [latest version of @schemavaults/init-next-app published to NPM](https://www.npmjs.com/package/@schemavaults/init-next-app):
```bash
npx @schemavaults/init-next-app my-new-app-name
```

Any value not provided via a flag is requested via an interactive stdin prompt.

### Non-interactive usage

For scripts and CI where stdin prompts are not possible, pass every value as a flag:

```bash
npx @schemavaults/init-next-app my-new-app-name \
  --display-name "My New App" \
  --description "A short description of my new app" \
  --client-app-id "00000000-0000-0000-0000-000000000000" \
  --api-server-id "00000000-0000-0000-0000-000000000000"
```

| Flag | Description |
| --- | --- |
| `--display-name <name>` | Human-readable project name. |
| `--description <text>` | Project description. |
| `--client-app-id <uuid>` | `SCHEMAVAULTS_CLIENT_APP_ID` written to `.env.local` (must be a valid UUID). |
| `--api-server-id <uuid>` | `SCHEMAVAULTS_API_SERVER_ID` written to `.env.local` (must be a valid UUID). |

## Development

### Install dependencies
```bash
bun install
```

### Build and run CLI locally
```bash
bun run build
node ./dist/index.js test-app
```

## Tests
```bash
bun run test
```
