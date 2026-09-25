---
name: api-routes
description: Use when adding, changing or removing an HTTP API endpoint under src/app/api — a new route, a new method on an existing route, request/response schema or auth changes — or when public/openapi.json or /docs is stale. Endpoints are defined with @schemavaults/openapi-operations (zod schemas + auth + handler in one definition), served as one Hono app per Next.js route.ts, documented in openapi.json and rendered at /docs by @schemavaults/openapi-docs-ui.
---

# API routes (`@schemavaults/openapi-operations` + `@schemavaults/openapi-docs-ui`)

Every API endpoint in this project is:

1. **Defined once** — method, path, zod request/response schemas, auth
   requirements and the handler — in `src/app/api/<path>/operations.ts` with
   `defineApiOperation()` from `@/lib/api/operation`.
2. **Registered** in the catalogue `src/lib/api/operations.ts`.
3. **Served** by the sibling `src/app/api/<path>/route.ts`, which exports
   `apiRoute([...])` from `@/lib/api/api` — one Hono app per Next.js route.
4. **Documented** in `public/openapi.json` (served at `/openapi.json`), generated
   from the catalogue by `bun run openapi:generate`, and browsable at `/docs`
   (index) and `/docs/<slug>` (one page per operation), rendered live from the
   same catalogue by `@schemavaults/openapi-docs-ui`.

The runtime (`@schemavaults/openapi-operations`) resolves credentials, enforces
the route guard / scopes / organization role, validates params, query, headers
and body against the schemas (400, 415), and calls the handler with typed input.

## Adding an endpoint — checklist

1. Pick the URL under `/api/` with OpenAPI-style parameters: `/api/items/{id}`.
   The directory mirrors it in Next.js form: `src/app/api/items/[id]/`. Route
   groups `(group)` are ignored; catch-all segments are not supported.
2. Create `src/app/api/items/[id]/operations.ts` exporting one
   `defineApiOperation()` per HTTP method (template below).
3. Add each export to the `apiOperations` array in `src/lib/api/operations.ts`.
4. Create `src/app/api/items/[id]/route.ts`:
   `export const { GET, DELETE } = apiRoute([getItem, deleteItem]);`
5. Run `bun run openapi:generate` and commit `public/openapi.json` with the code.
   `bun run lint` and CI run `bun run openapi:check`, which fails when the file
   is stale, when an operation is missing from the catalogue, when a
   catalogue entry is not exported by any `operations.ts`, or when a path does
   not match its directory.
6. Verify with `bun run typecheck && bun run lint`, then open `/docs` with
   `bun run dev` (dev regenerates the document on start).

Removing an endpoint: delete the directory, remove its entries from the
catalogue, run `bun run openapi:generate`.

## `operations.ts` template

```ts
import {
  OperationError,
  OperationErrorBodySchema,
  authenticatedAccess,   // or adminAccess(), publicAccess()
  defineApiOperation,
  z,
} from "@/lib/api/operation";

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
  tags: ["Items"],               // groups the operation on /docs
  auth: authenticatedAccess(),   // see "Authentication" below
  request: {
    params: z.object({ id: z.uuid() }),      // keys must equal the {placeholders}
    query: z.object({                        // strings, or string[] for repeated keys
      expand: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }),
    // headers: z.object({ "x-request-id": z.string().optional() }),   // lower-case keys
    // body: {                                                          // POST/PUT/PATCH/DELETE
    //   schema: z.object({ name: z.string() }).openapi("UpdateItemRequest"),
    //   description: "What to change.",
    //   lenientContentType: true,   // also accept text/plain / no Content-Type as JSON
    // },
  },
  responses: {
    200: { description: "The item.", schema: ItemSchema },
    404: { description: "No such item.", schema: OperationErrorBodySchema },
    // 204: { description: "Deleted." },   // no schema => use ctx.empty(204)
  },
  handler: async (ctx) => {
    // ctx.params / ctx.query / ctx.headers / ctx.body are validated and typed.
    // ctx.auth is the principal: null on publicAccess() operations, with a
    // non-null `user` on authenticatedAccess() / adminAccess() ones.
    // ctx.context is the per-request ApiRequestContext: `ctx.context.dbh`
    // (lazily opened Kysely handle) and `ctx.context.environment`.
    const item = await loadItem(ctx.context.dbh, ctx.params.id, ctx.auth.user.uid);
    if (!item) {
      throw new OperationError(404, { error: "not_found", message: "No such item" });
    }
    return ctx.json(200, item);   // status + body are type-checked against `responses`
  },
});
```

The document automatically lists `400` (when the operation validates
anything), `401` (protected operations), `403` (admin guard, required scopes
or organization role), `415` (operations with a body) and `500`
(`documentRuntimeResponses: true` in `src/lib/api/openapi-document.ts`).
Declare the other statuses you return yourself, with
`OperationErrorBodySchema` for errors.

## `route.ts` template

```ts
import { apiRoute } from "@/lib/api/api";
import { deleteItem, getItem } from "./operations";

export const { GET, DELETE } = apiRoute([getItem, deleteItem]);
```

`apiRoute()` builds a Hono app for exactly these operations from the shared
factory (`api` in `src/lib/api/api.ts`) and exports only the methods they
declare, so Next.js answers 405 for the rest. It throws at module load if an
operation is not in the catalogue. Never put server-only imports in
`operations.ts` (they belong in `route.ts` or behind `ctx.context`): the
OpenAPI generator imports `operations.ts` under bun.

## Handler context

| Field | Meaning |
| --- | --- |
| `ctx.params`, `ctx.query`, `ctx.headers`, `ctx.body` | Validated, typed input (`{}` / `undefined` when not declared) |
| `ctx.auth` | `null` for public operations; otherwise the principal (`user: UserData`, `isAdmin`, `scope`, `getOrganizationRole`). `user` is non-null because both SchemaVaults schemes declare `principal: "user"`; `requireUser(ctx.auth)` exists for operations that also accept non-user schemes (API keys) |
| `ctx.context` | `ApiRequestContext`: `dbh` (lazy `ServerlessDatabase`), `environment`; disposed after the response |
| `ctx.request`, `ctx.url` | The raw request |
| `ctx.json(status, body, init?)` | Typed JSON response for a declared status |
| `ctx.empty(status)` | Body-less response for a declared status without a schema |
| `ctx.redirect(location, status?)` | Redirect |

Throw `new OperationError(status, { error, message, details? })` for expected
failures. Anything else thrown becomes a `500` `internal_server_error`, logged
via the factory's `onError`. Error envelope for every error response:
`{ "success": false, "error": "<code>", "message": "...", "issues"?: [...] }`
(`OperationErrorBodySchema`, `components.schemas.OperationError`).

## Authentication

- `publicAccess()` — no credentials.
- `authenticatedAccess(options?)` — any signed-in SchemaVaults user.
- `adminAccess(options?)` — platform administrators only.
- `options`: `{ requiredScopes: ["email"], organization: { parameter: "organization_id", roles: ["owner", "admin"] }, notes }`.

Protected operations accept the SchemaVaults access token either as
`Authorization: Bearer <access token>` or as the first-party access-token
cookie set by this app's login flow (`src/lib/api/operation.ts`,
`schemaVaultsAuthSchemes`). Verification is
`createSchemaVaultsAuthResolvers()` from
`@schemavaults/auth-server-sdk/openapi-operations` (wired in
`src/lib/api/api.ts`): remote JWKS verification through `RouteGuardFactory`,
so `SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY` and
`SCHEMAVAULTS_AUTH_SERVER_URL` must be set at runtime; without the key it
answers `500` `auth_not_configured` rather than accepting anything. Pass
`{ acceptedAudiences, isTokenRevoked, debug }` to it for RFC 8707 resource
URLs, revocation checks or diagnostics. The docs pages show the accepted
schemes, route guard, scopes and organization role per operation.

## Conventions

- `operationId`: unique, camelCase verb + noun (`listItems`, `createItem`,
  `getItem`, `updateItem`, `deleteItem`).
- Use `.openapi("Name")` on request/response object schemas worth naming and
  `.openapi({ description, example })` on fields so `/docs` shows examples.
  For schemas built by other packages use `withOpenApi(schema, "Name")`.
- Query and path values are strings: `z.coerce.number()`,
  `z.enum(["true","false"]).transform(...)`, etc.
- Request bodies default to `application/json`; set `contentType` for form
  bodies, `lenientContentType: true` for browser `fetch` callers that omit
  the header, `documentOnly: true` to parse the body yourself.
- Document metadata (title, description, servers, tag descriptions) lives in
  `src/lib/api/openapi-info.ts`; the version comes from `package.json`.

## Files

| Path | Purpose |
| --- | --- |
| `src/lib/api/operation.ts` | `defineApiOperation`, `publicAccess`/`authenticatedAccess`/`adminAccess`, `OperationErrorBodySchema`, `requireUser`, `z`, `OperationError` |
| `src/lib/api/operations.ts` | The catalogue: every operation, in one array |
| `src/lib/api/api.ts` | `createOperationsAppFactory` bound to the catalogue, `createSchemaVaultsAuthResolvers()` and the request context; `apiRoute()` |
| `src/lib/api/request-context.ts` | `ApiRequestContext` (`dbh`, `environment`) built and disposed per request |
| `src/lib/api/openapi-document.ts` | `getOpenApiDocument()` — `buildOpenApiDocument({ documentRuntimeResponses: true })` over the catalogue |
| `src/lib/api/openapi-info.ts` | `info`, `servers`, `tags` of the document |
| `scripts/generate-openapi.ts` | Writes/checks `public/openapi.json` after `checkNextAppRouterRoutes()` (catalogue ↔ `operations.ts` files ↔ directories) |
| `src/app/docs/api-docs.tsx`, `page.tsx`, `[slug]/page.tsx` | `/docs` via `createApiDocsPages` from `@schemavaults/openapi-docs-ui/nextjs` |
| `src/app/api/health`, `src/app/api/greet/[name]`, `src/app/api/me` | Examples: public, params/query/body, authenticated |

## Troubleshooting

- **`openapi:check` fails in CI** — run `bun run openapi:generate` locally and
  commit `public/openapi.json`.
- **`checkNextAppRouterRoutes` reports an operation missing from
  `src/lib/api/operations.ts`** — add the export to the catalogue.
- **… reports a path that does not match its folder** — `path` must match the
  directory (`[id]` ↔ `{id}`).
- **`apiRoute()` throws "not part of the catalogue"** — same fix: register it.
- **415 from browser `fetch`** — the caller omitted `Content-Type:
  application/json`; either set it or add `lenientContentType: true`.
- **`/api/me` answers 500 `auth_not_configured`** — set
  `SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY` (see `.env.example`).
- For Next.js route handler semantics (caching, runtime) consult the
  `nextjs-docs` skill.
