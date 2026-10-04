---
name: commit-changes
description: Use when committing, pushing or opening a pull request in the @schemavaults/init-next-app repository. CI publishes package.json's version to npm on every push to main, so each branch must raise that version by semver (once, relative to main) or the publish step fails with a version conflict. Covers choosing patch/minor/major, checking origin/main and npm, the commit message format and the checks to run before committing.
---

# Committing changes to @schemavaults/init-next-app

The `publish` job in `.github/workflows/ci.yml` runs `npm publish` on **every
push to `main`**. npm refuses to publish a version that already exists, so a
branch merged without a version bump turns `main` red and its changes never
reach npm. Every branch that will be merged into `main` must raise `version`
in the root `package.json`: once per branch, not once per commit.

Changes that only touch `templates/` still need a bump: the template ships
inside the package. So do docs, test and CI changes, because every merge to
`main` publishes.

The template has its own `commit-changes` skill
(`templates/schemavaults-next-app/.claude/skills/commit-changes/`). It is for
apps generated from the template, not for this repository, even when every
file you changed is under `templates/`. Never change the
`version` in `templates/schemavaults-next-app/package.json`: it is the starting
version of every scaffolded app.

## 1. Choose the bump

The package's public surface is the CLI (positional argument, flags, prompts,
defaults, exit codes), the Node/Bun versions it needs, and what it generates.

| Change | Examples | From 1.0.0 | While 0.x (now) |
| --- | --- | --- | --- |
| Breaking | Remove or rename a flag or one of its values; change a default; require a new value in non-interactive runs; raise the minimum Node or Bun version | major | minor: `0.1.4` → `0.2.0` |
| Feature | New optional flag or flag value; new scaffolded file, skill, script, dependency or lint rule | minor | patch: `0.1.4` → `0.1.5` |
| Fix or chore | Bug fix, dependency update, docs, tests, CI | patch | patch |

While the major version is 0, npm treats the minor version as the breaking
one (`^0.1.0` only matches `0.1.x`), so breaking changes bump minor and
everything else bumps patch. Releasing 1.0.0 is the maintainers' decision:
never make that bump on your own.

## 2. Bump once per branch

Compare this branch, `main` and npm:

```bash
git fetch origin main
node -p 'require("./package.json").version'                         # this branch
git show origin/main:package.json | node -p 'JSON.parse(require("fs").readFileSync(0, "utf8")).version'
npm view @schemavaults/init-next-app version                        # latest on npm
```

- **Same version as `main`:** bump now.
- **Already higher than `main`:** this branch has bumped. Keep the version
  unless your change needs a bigger bump than the one already made. For
  example, `main` is `0.1.4`, the branch is `0.1.5`, and you now make a
  breaking change: go to `0.2.0`.
- The new version must be greater than npm's latest and must not be published
  yet. `npm view @schemavaults/init-next-app@<version> version` prints nothing
  for an unpublished version.

Bump with npm, which edits only `version` in `package.json`, without
committing or tagging:

```bash
npm version patch --no-git-tag-version   # or minor / major / an explicit 0.2.0
```

No other file records the package's version (`bun.lock` doesn't).

## 3. Check before committing

Run what covers your change. CI runs all of it, across every
`--deployment` × `--blob-storage` combination.

| Changed | Run |
| --- | --- |
| `src/` | `bun run typecheck && bun run build` |
| `templates/` | `bun run test:template` (installs, type-checks and lints the template, checks `.mouldconfig.json`) |
| CLI behaviour, template or packaging | `bun run test` (packs the tarball, scaffolds `test-app/`, then installs, type-checks, lints and builds it; also `bun run test none none`) |

`bun run test` takes several minutes and needs npm registry access. If you
can't run it, say so in the PR rather than implying that it passed.

Keep `README.md` (and the template's `README.md`) in sync when flags,
scaffolded files or skills change.

## 4. Commit

Start the subject line with the branch's new version, then an imperative
summary. Every commit on the branch uses the same version prefix:

```
0.1.5 - scaffold a small-modules Claude skill and max-lines lint rule
```

Stage files by name and check `git status` before committing. `test-app/`,
`tmp/`, `dist/` and the template's `node_modules/`, `.next/` and generated
files are git-ignored. Don't force-add them.
