# @schemavaults/init-next-app

A CLI tool for scaffolding out a new Next.js application with [@schemavaults/auth](https://github.com/schemavaults/auth), [@schemavaults/theme](https://github.com/schemavaults/theme), and [@schemavaults/dbh](https://github.com/schemavaults/dbh) configured.

When initializing a project, the CLI also installs the [@schemavaults/dbh](https://github.com/schemavaults/dbh) `database-migrations` Claude Code skill into the new project's `.claude/skills/` (via `npx skills add`), so coding agents know how to author migrations in the format this template scaffolds. It additionally scaffolds a `nextjs-docs` skill that points coding agents at the version-matched Next.js documentation bundled with the installed `next` package (`node_modules/next/dist/docs/`) instead of web searches or memory.

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
  --client-app-id "my-new-app" \
  --api-server-id "my-api-server" \
  --auth-server-url "https://auth.schemavaults.com"
```

| Flag | Description |
| --- | --- |
| `--display-name <name>` | Human-readable project name. |
| `--description <text>` | Project description. |
| `--client-app-id <id>` | `SCHEMAVAULTS_CLIENT_APP_ID` written to `.env.local`. Validated with `appIdSchema` from [`@schemavaults/app-definitions`](https://www.npmjs.com/package/@schemavaults/app-definitions): 2-64 characters of lowercase alphanumerics, hyphens, and underscores, starting with an alphanumeric and not ending with a hyphen or underscore (UUIDs remain valid). |
| `--api-server-id <id>` | `SCHEMAVAULTS_API_SERVER_ID` written to `.env.local`. Validated with `apiServerIdSchema` from [`@schemavaults/app-definitions`](https://www.npmjs.com/package/@schemavaults/app-definitions) (same format as `--client-app-id`). |
| `--auth-server-url <url>` | `SCHEMAVAULTS_AUTH_SERVER_URL` written to `.env.local` (must be an http(s) URL). Defaults to `https://auth.schemavaults.com`; set this to point the app at a self-hosted auth server, e.g. `https://auth.acmecorp.com`. When prompted interactively, press enter to accept the default. |
| `--deployment <strategy>` | `vercel` or `none`. With `vercel`, the app also gets a `vercel.json`, a `publish-to-vercel` job in `.github/workflows/ci.yml`, and `VERCEL_*` entries in `.env.example`. |

## How it works

The generated application lives in this repository as a **real Next.js project**,
[`templates/schemavaults-next-app/`](./templates/schemavaults-next-app), and is rendered by
[`@jalexw/mould`](https://github.com/jalexw/mould). Every file you see there is copied to the new
project as-is, apart from:

- **Placeholders** such as `xxx_project_name_xxx` and `xxx_display_name_xxx`, which are replaced
  with the values you pass. They are lowercase, identifier-safe tokens, so the template itself is a
  valid npm package name / env value / JSX text and installs and type-checks unmodified. The auth
  server URL is substituted from its literal default `https://auth.schemavaults.com`.
- **Conditional blocks** wrapped in `# mould:if deployment == vercel` … `# mould:endif` comment
  lines (`.github/workflows/ci.yml`, `.env.example`), and `vercel.json`, which is only copied when
  `--deployment vercel` is chosen.
- **`_gitignore`**, written to the new project as `.gitignore` (npm would otherwise rename a real
  `.gitignore` inside the published package).
- **`@schemavaults/*` versions** in `package.json`, which the CLI bumps to the latest published
  versions after rendering; the template pins real versions so it installs on its own.

The mapping is declared in [`.mouldconfig.json`](./templates/schemavaults-next-app/.mouldconfig.json).
After rendering, the CLI runs `bun install`, `bun run auth-codegen` and installs the
`database-migrations` Claude skill, as before.

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

### Edit the template

Work on the template like on any other Next.js app — with type checking, eslint and your editor's
tooling:
```bash
cd templates/schemavaults-next-app
bun install
bun run typecheck   # runs auth-codegen first; its output is git-ignored and never shipped
bun run lint
```

Rules of thumb:
- Never add a `.gitignore` inside the template; edit `_gitignore` for the generated app and the
  repository root `.gitignore` for development artefacts.
- New placeholders must be declared under `substitutions` in `.mouldconfig.json`; new
  build artefacts must be listed in three places: `ignorePatterns` in `.mouldconfig.json` (so
  mould never copies them), the root `.gitignore` (so git never tracks them), and the negated
  `files` entries in the root `package.json` (so `npm pack` never ships them — a checkout where
  the template was just installed would otherwise put its `node_modules/` in the tarball).
- `scripts/test-template.sh` checks all of the above and that the template type-checks.

## Tests
```bash
bun run test            # end-to-end: pack, scaffold test-app from the tarball, install, typecheck, lint, build
bun run test:template   # the template directory itself installs, type-checks and lints
```
