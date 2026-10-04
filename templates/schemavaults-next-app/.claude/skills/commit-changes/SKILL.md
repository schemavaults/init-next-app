---
name: commit-changes
description: Use when committing, pushing or opening a pull request in this app. Every change that reaches main raises package.json's version by semver, once per branch relative to main; that version is also the info.version of /openapi.json and /docs. Covers choosing patch/minor/major, bumping once per branch, the checks to run before committing and the commit message format.
---

# Committing changes

> **Editing the init-next-app template?** If this file is at
> `templates/schemavaults-next-app/.claude/skills/commit-changes/` inside the
> `@schemavaults/init-next-app` repository, you are changing the template, not
> an app. Stop here: follow the repository root's `commit-changes` skill
> (`.claude/skills/commit-changes/`), and leave this app's `version` alone.

Every change merged into `main` raises `version` in `package.json` by
[semver](https://semver.org). The version identifies what is deployed. It is
also `info.version` of `/openapi.json` and `/docs`
(`src/lib/api/openapi-info.ts`), so API consumers can tell releases apart.

## 1. Choose the bump

The app's public surface is its HTTP API (`/openapi.json`), its page URLs,
and what an operator must provide: environment variables and database
migrations.

| Change | Examples | From 1.0.0 | While 0.x |
| --- | --- | --- | --- |
| Breaking | Remove or rename an endpoint, page URL, response field or env var; make a request field or parameter required; accept fewer values; tighten an operation's auth; a migration that drops data or needs manual steps | major | minor: `0.3.2` → `0.4.0` |
| Feature | New endpoint, page, optional request field, response field, or env var with a default; a backwards-compatible migration | minor | patch: `0.3.2` → `0.3.3` |
| Fix or chore | Bug fix, refactor, styling, dependency update, docs, tests | patch | patch |

While the major version is 0, the minor version marks breaking changes, and
everything else bumps patch. Releasing 1.0.0 is the owners' decision: never
make that bump on your own.

## 2. Bump once per branch

Compare this branch with `main` (or the default branch):

```bash
git fetch origin main
node -p 'require("./package.json").version'                         # this branch
git show origin/main:package.json | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version'
```

- **Same version as `main`:** bump now.
- **Already higher than `main`:** this branch has bumped. Keep the version
  unless your change needs a bigger bump than the one already made. For
  example, `main` is `0.3.2`, the branch is `0.3.3`, and you now make a
  breaking change: go to `0.4.0`.
- **Committing straight to `main`:** bump once per push.

Bump without committing or tagging. This edits only `version` in
`package.json`:

```bash
npm version patch --no-git-tag-version   # or minor / major / an explicit 0.4.0
```

## 3. Check before committing

```bash
bun run typecheck
bun run lint        # also checks API routes against the catalogue and file length (small-modules skill)
bun run build       # when routes, config, dependencies or environment handling changed
```

Fix lint errors, and don't introduce new `max-lines` warnings.

## 4. Commit

Start the subject line with the branch's new version, then an imperative
summary. Every commit on the branch uses the same version prefix:

```
0.3.3 - add item endpoints
```

Stage files by name and check `git status` before committing. Never commit
`.env*` files other than `.env.example`, or generated output
(`src/app/(client)/auth/`, `public/openapi.json`, `.next/`).
