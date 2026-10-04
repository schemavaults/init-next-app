---
name: small-modules
description: Use when writing or changing code under src/, especially when a file nears or passes 200 lines or lint reports max-lines or small-modules/max-lines. Keep each module under about 200 lines so people can review it; eslint warns above 200 lines and fails above 350. Covers how to split components, hooks, API operations and helpers, and how not to game the limit.
---

# Small modules

Keep every source file under **about 200 lines**. People review changes file
by file. A 150-line module with one job can be read carefully; a 600-line one
gets skimmed.

`eslint.config.cjs` enforces this for everything `bun run lint` checks
(`src/`):

| File length | Rule | Effect |
| --- | --- | --- |
| over 200 lines | `max-lines` | warning: split the file |
| over 350 lines | `small-modules/max-lines` | error: `bun run lint` fails |

Lines are physical lines, including comments and blank lines: what `wc -l`
and a diff show. Generated code (`src/app/(client)/auth/`) is exempt.

## When you touch a file

- Check its length first (`wc -l <file>`). If your change would take it past
  200 lines, or adds lines to a file that is already past 200, split it first,
  then make the change. Splitting in a separate commit makes both diffs easier
  to review.
- A small fix that doesn't grow an already-long file doesn't require a split.
  Mention the file's length to the user instead of restructuring it unasked.
- Start new files well under the limit: one component, hook, operation group
  or concern per file.

## Where to split

Split along responsibilities, not at an arbitrary line.

| The file grew because of... | Move it to |
| --- | --- |
| Sections of a component's JSX | Child components in sibling files (`item-list.tsx`, `item-row.tsx`) |
| State, effects or data fetching in a component | A custom hook (`use-items.ts`) |
| zod schemas, types or constants | `schemas.ts`, `types.ts` or `constants.ts` next to the code that uses them |
| Pure helpers and formatting | `src/lib/<topic>.ts`, or a sibling `utils.ts` if only one folder uses them |
| A page that loads data and renders it | `page.tsx` loads data on the server, `view.tsx` renders (as in `src/app/(client)/(index)/`) |
| Large handlers or schemas in an `operations.ts` | Request/response schemas in a sibling `schemas.ts`; business logic in `src/lib/<domain>.ts`, so each handler is a short adapter |

Keep the `defineApiOperation()` calls in `operations.ts`, where
`bun run openapi:check` looks for them. Modules that `operations.ts` imports
must not import `server-only`, because the OpenAPI generator loads them under
bun (see the `api-routes` skill).

Put modules used by one route in a private `_components/` or `_lib/` folder
inside that route; Next.js ignores `_`-prefixed folders for routing. Move a
module to a shared folder (`src/lib/`, `src/components/`) when a second route
needs it.

Name each new module for what it does. If you can only name the pieces
`part-1.ts` and `part-2.ts`, look for a different seam.

## Don't game the limit

- Don't delete useful comments, join statements or compress formatting to get
  under the limit.
- Don't add `eslint-disable` comments for `max-lines` or
  `small-modules/max-lines`, and don't raise the thresholds.
- If a file truly can't be split (a large static data table, for example),
  ask the user. If they agree, exempt that one path in `eslint.config.cjs`
  with a comment that says why.
