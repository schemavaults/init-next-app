/**
 * `@schemavaults/openapi-operations` bound to this application: the
 * `defineApiOperation()` used by every `src/app/api/**\/operations.ts`, the
 * auth schemes a caller may present, and the error envelope schema.
 *
 * Keep this module free of server-only runtime imports (database, Next.js):
 * it is imported by `scripts/generate-openapi.ts` under bun to produce
 * `public/openapi.json`. Server resources reach handlers through
 * `ctx.context` (see `./request-context.ts`), typed here via `import type`.
 */
import {
  OperationError,
  OperationErrorBodySchema,
  createOperationDefiner,
  publicAccess,
  requireAuth,
  requireUser,
  schemaVaultsAccessTokenBearerScheme,
  schemaVaultsAccessTokenCookieScheme,
  withOpenApi,
  z,
  type AuthRequirements,
  type RequiredOperationAuth,
} from "@schemavaults/openapi-operations";
import { AccessTokenCookieName, type UserData } from "@schemavaults/auth-server-sdk";
import type { ApiRequestContext } from "./request-context";

export { OperationError, OperationErrorBodySchema, publicAccess, requireUser, withOpenApi, z };
export type { UserData };

/**
 * The API server id this app is registered as with the auth server. Read
 * from the environment; the literal fallback is substituted with the same
 * value when the project is scaffolded, so the access-token cookie name in
 * `public/openapi.json` is identical whether or not `.env.local` is loaded.
 */
export const API_SERVER_ID: string =
  process.env.SCHEMAVAULTS_API_SERVER_ID ?? "xxx_api_server_id_xxx";

/** `Authorization: Bearer <access token>` — for scripts, other services, MCP clients. */
export const accessTokenBearerScheme = schemaVaultsAccessTokenBearerScheme;

/** The first-party access-token cookie set by this app's own login flow. */
export const accessTokenCookieScheme = schemaVaultsAccessTokenCookieScheme(
  AccessTokenCookieName(API_SERVER_ID),
);

/**
 * Every credential a protected operation accepts (any one of them suffices).
 * Both schemes declare `principal: "user"`, so handlers get a non-null
 * `ctx.auth.user`.
 */
export const schemaVaultsAuthSchemes = [
  accessTokenBearerScheme,
  accessTokenCookieScheme,
] as const;

export type SchemaVaultsAuthSchemes = typeof schemaVaultsAuthSchemes;
export type AccessOptions = Omit<
  AuthRequirements<SchemaVaultsAuthSchemes>,
  "schemes" | "routeGuard"
>;

/** Any signed-in SchemaVaults user (route guard `authenticated`). */
export function authenticatedAccess(
  options: AccessOptions = {},
): RequiredOperationAuth<SchemaVaultsAuthSchemes> {
  return requireAuth({ schemes: schemaVaultsAuthSchemes, routeGuard: "authenticated", ...options });
}

/** Platform administrators only (route guard `admin`). */
export function adminAccess(
  options: AccessOptions = {},
): RequiredOperationAuth<SchemaVaultsAuthSchemes> {
  return requireAuth({ schemes: schemaVaultsAuthSchemes, routeGuard: "admin", ...options });
}

/**
 * Define one HTTP operation (method + path + schemas + auth + handler).
 * `ctx.context` is an {@link ApiRequestContext}; on `authenticatedAccess()` /
 * `adminAccess()` operations `ctx.auth.user` is the SchemaVaults `UserData`
 * (null on `publicAccess()` operations).
 */
export const defineApiOperation = createOperationDefiner<ApiRequestContext, UserData>();
