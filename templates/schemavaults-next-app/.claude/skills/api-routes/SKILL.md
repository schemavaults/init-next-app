---
name: api-routes
description: Use when adding, changing or removing an HTTP API endpoint under src/app/api — a new route, a new method on an existing route, request/response schema changes, auth requirements — or when public/openapi.json or /docs is stale. Every endpoint is a Hono app defined with zod schemas via @asteasolutions/zod-to-openapi so it is validated at runtime and documented in openapi.json automatically.
---

# API routes (Hono + zod + OpenAPI)

Every API endpoint in this project is:

1. **Defined** once, with zod schemas, in `src/app/api/<path>/operations.ts`
   using `defineApiOperation()` from `@/lib/api/define`.
2. **Implemented** in the sibling `src/app/api/<path>/route.ts` with
   `createApiRoute()` from `@/lib/api/create-api-route`, which builds **one
   Hono app per Next.js route** and exports the `GET`/`POST`/… handlers.
3. **Documented** in `public/openapi.json`, generated from every
   `operations.ts` by `bun run openapi:generate`. `/openapi.json` serves the
   file and `/docs` renders it (no external UI dependencies).

The definitions are pure (no `server-only`, no database, no auth SDK at
runtime), which is what lets a bun script import them to produce the document.
Never put server-side imports in `operations.ts`; they belong in `route.ts`.

## Adding an endpoint — checklist

1. Pick the URL. It must live under `/api/` and use OpenAPI-style path
   parameters: `/api/items/{id}`. The directory mirrors it with Next.js
   conventions: `src/app/api/items/[id]/`. Route groups `(group)` are ignored;
   catch-all segments are not supported.
2. Create `src/app/api/items/[id]/operations.ts` exporting one
   `defineApiOperation()` per HTTP method (see the template below).
3. Create `src/app/api/items/[id]/route.ts` and implement every operation:
   `export const { GET, DELETE } = createApiRoute(getItem.implement(...), deleteItem.implement(...))`.
4. Run `bun run openapi:generate` (rewrites `public/openapi.json`) and commit
   the JSON together with the code. `bun run lint` and CI run
   `bun run openapi:check`, which fails when the file is stale.
5. Verify: `bun run typecheck && bun run lint`, then check the endpoint on
   `/docs` (or `curl`) with `bun run dev` (dev regenerates the document on start).

Removing an endpoint: delete the directory, then run `bun run openapi:generate`.

## `operations.ts` template

```ts
import { defineApiOperation, z } from "@/lib/api/define";
import { ApiErrorResponseSchema } from "@/lib/api/error-response";

// Name reusable schemas with .openapi("Name") so they become
// components.schemas entries (and $refs) instead of being inlined.
export const ItemSchema = z
  .object({
    id: z.uuid().openapi({ example: "123e4567-e89b-12d3-a456-426614174000" }),
    name: z.string().min(1).max(120).openapi({ example: "Widget" }),
    created_at: z.iso.datetime(),
  })
  .openapi("Item");

export const getItem = defineApiOperation({
  method: "get",                 // get | post | put | patch | delete | head | options
  path: "/api/items/{id}",       // must match this file's directory
  operationId: "getItem",        // unique across the API; camelCase verb+noun
  summary: "Get an item",
  description: "Longer explanation shown on /docs (optional).",
  tags: ["Items"],               // first tag groups the operation on /docs
  access: "authenticated",       // "public" (default) | "authenticated" | "admin"
  request: {
    params: z.object({ id: z.uuid() }),            // keys must equal the {placeholders}
    query: z.object({                              // values arrive as strings
      expand: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
    // body: z.object({ ... }).openapi("UpdateItemRequest"),   // JSON body
    // bodyDescription: "What to change.",
  },
  responses: {
    200: { description: "The item.", schema: ItemSchema },
    404: { description: "No such item.", schema: ApiErrorResponseSchema },
    // 204: { description: "Deleted." },   // no schema => empty body
  },
});
```

Every operation automatically documents `400` (when it declares any
request schema), `401` (when `access` is not `public`), `403` (when `access`
is `admin`) and `500`. Declare other statuses you return yourself.

## `route.ts` template

```ts
import { createApiRoute } from "@/lib/api/create-api-route";
import { ApiError } from "@/lib/api/error-response";
import { ServerlessDatabase } from "@/db/serverless-database";
import { getItem, deleteItem } from "./operations";

export const { GET, DELETE } = createApiRoute(
  getItem.implement(async ({ params, query, auth, reply }) => {
    // params/query/body are already validated and typed from the schemas.
    // auth is null for public operations, otherwise { user, environment, isUserInOrganization }.
    await using dbh = ServerlessDatabase.createDBH();
    const item = await loadItem(dbh, params.id, auth.user.uid, query.expand);
    if (!item) throw new ApiError(404, "not_found", "No such item");
    return reply(200, item);          // only declared statuses/bodies type-check
  }),

  deleteItem.implement(async ({ params, reply }) => {
    await remove(params.id);
    return reply(204);
  }),
);
```

Rules enforced at startup or by types:

- All operations passed to one `createApiRoute()` must share the same `path`
  (a `route.ts` serves exactly one path), and each method at most once.
- `reply(status, body)` accepts only statuses declared in `responses`, with a
  body matching that status's schema. In development the body is also
  validated at runtime and a mismatch throws, so schema drift is caught early.
- Throw `ApiError(status, code, message)` for expected failures; anything else
  thrown becomes a `500` `internal_error` and is logged.
- For streaming, redirects, cookies or non-JSON responses use the Hono
  context `c` from the handler arguments and return its `Response` directly.

## Authentication

`access: "authenticated"` / `"admin"` wraps the handler with the SchemaVaults
auth route guards (`withAuthenticatedApiRouteGuard` / `withAdminApiRouteGuard`
from `@schemavaults/auth-server-sdk/route_guards`). The guard accepts the
access-token cookie set by the app's own login flow or an
`Authorization: Bearer <access token>` header, and answers `401`/`403`
itself before the handler runs. The OpenAPI document marks these operations
with the `bearerAuth` security scheme.

## Conventions

- `operationId`: unique, camelCase, verb + noun (`listItems`, `createItem`,
  `getItem`, `updateItem`, `deleteItem`). The generator fails on duplicates.
- Use `.openapi("Name")` on request/response object schemas that are reused
  or worth naming; use `.openapi({ description, example })` on fields so
  `/docs` shows meaningful examples.
- Query and path values are strings: use `z.coerce.number()`,
  `z.enum(["true","false"]).transform(...)`, etc. For repeated query keys read
  `c.req.queries("key")` from the Hono context.
- Request bodies are `application/json` only.
- Error envelope: `{ "error": { "code", "message", "issues?" } }`
  (`ApiErrorResponseSchema`). Auth failures use the guard's shape
  (`AuthErrorResponseSchema`).
- Document metadata (title, description, servers) lives in
  `src/lib/api/openapi-info.ts`; the version comes from `package.json`.

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/api/define.ts` | `defineApiOperation`, `ApiOperation`, `z` (with `.openapi()`), handler/context types |
| `src/lib/api/create-api-route.ts` | `createApiRoute` — Hono app per route, validation, auth guard, error handling |
| `src/lib/api/error-response.ts` | `ApiError`, `ApiErrorResponseSchema`, `AuthErrorResponseSchema`, response builders |
| `src/lib/api/openapi-document.ts` | Builds the OpenAPI 3.1 document from operations (zod-to-openapi registry/generator) |
| `src/lib/api/openapi-info.ts` | Title/description/version/servers of the document |
| `scripts/generate-openapi.ts` | Discovers `src/app/api/**/operations.ts`, validates paths/ids, writes or checks `public/openapi.json` |
| `public/openapi.json` | The committed document; served at `/openapi.json` |
| `src/app/docs/page.tsx` + `src/components/openapi-docs/` | `/docs`, a dependency-free renderer of the document |
| `src/app/api/health`, `src/app/api/greet/[name]`, `src/app/api/me` | Examples: public, params/query/body, authenticated |

## Troubleshooting

- **`openapi:check` fails in CI** — run `bun run openapi:generate` locally and
  commit `public/openapi.json`.
- **"declares path X but its directory maps to Y"** — the `path` in
  `defineApiOperation` must match the directory (`[id]` ↔ `{id}`).
- **"request.params must declare exactly the path parameters"** — the
  `params` zod object keys must equal the `{placeholders}` in `path`.
- **"reply(…) is not declared"** — add the status to `responses`.
- **`operations.ts` fails to import in the generator** — it imports something
  server-only; move that import to `route.ts`.
- For Next.js route handler semantics (caching, `dynamic`, runtime) consult
  the `nextjs-docs` skill.
