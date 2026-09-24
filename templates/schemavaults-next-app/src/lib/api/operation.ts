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
  createOperationDefiner,
  publicAccess,
  requireAuth,
  schemaVaultsAccessTokenBearerScheme,
  schemaVaultsAccessTokenCookieScheme,
  withOpenApi,
  z,
  type AuthPrincipal,
  type AuthRequirements,
  type RequiredOperationAuth,
} from "@schemavaults/openapi-operations";
import { AccessTokenCookieName, type UserData } from "@schemavaults/auth-common";
import type { ApiRequestContext } from "./request-context";

export { OperationError, publicAccess, withOpenApi, z };
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

/** Every credential a protected operation accepts (any one of them suffices). */
export const schemaVaultsAuthSchemes = [
  accessTokenBearerScheme,
  accessTokenCookieScheme,
] as const;

export type AccessOptions = Omit<AuthRequirements, "schemes" | "routeGuard">;

/** Any signed-in SchemaVaults user (route guard `authenticated`). */
export function authenticatedAccess(options: AccessOptions = {}): RequiredOperationAuth {
  return requireAuth({ schemes: schemaVaultsAuthSchemes, routeGuard: "authenticated", ...options });
}

/** Platform administrators only (route guard `admin`). */
export function adminAccess(options: AccessOptions = {}): RequiredOperationAuth {
  return requireAuth({ schemes: schemaVaultsAuthSchemes, routeGuard: "admin", ...options });
}

/**
 * Define one HTTP operation (method + path + schemas + auth + handler).
 * `ctx.context` is an {@link ApiRequestContext}; `ctx.auth.user` is the
 * SchemaVaults `UserData` (null on `publicAccess()` operations).
 */
export const defineApiOperation = createOperationDefiner<ApiRequestContext, UserData>();

/**
 * The signed-in user behind a protected operation. `ctx.auth.user` is typed
 * nullable because a principal could in principle be a non-user credential
 * (API key, client credentials); the SchemaVaults schemes above always
 * resolve a user, so this narrows it and fails closed otherwise.
 */
export function requireUser(auth: AuthPrincipal<UserData> | null): UserData {
  if (!auth?.user) {
    throw new OperationError(401, {
      error: "unauthorized",
      message: "This operation requires a signed-in user",
    });
  }
  return auth.user;
}

export const ApiErrorIssueSchema = z
  .object({
    location: z.enum(["params", "query", "headers", "body"]),
    path: z.string().openapi({ example: "greeting" }),
    message: z.string().openapi({ example: "Invalid input: expected string, received undefined" }),
    code: z.string().openapi({ example: "invalid_type" }),
  })
  .openapi("ApiErrorIssue");

/**
 * The `{ success: false, error, message }` envelope every error response
 * uses — both the ones the operations runtime produces (validation, auth,
 * unsupported media type, unexpected failures) and the ones handlers throw
 * with `new OperationError(status, { error, message })`.
 */
export const ApiErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.string().openapi({
      description: "Machine-readable error code.",
      example: "validation_error",
    }),
    message: z.string().openapi({ example: "Request validation failed" }),
    issues: z.array(ApiErrorIssueSchema).optional().openapi({
      description: "Present on `validation_error` responses.",
    }),
    details: z.record(z.string(), z.unknown()).optional().openapi({
      description: "Extra machine-readable details (e.g. missing scopes).",
    }),
  })
  .openapi("ApiErrorResponse");

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
