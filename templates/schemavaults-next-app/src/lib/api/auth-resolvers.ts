/**
 * Credential resolvers for the SchemaVaults auth schemes, keyed by scheme
 * name as `@schemavaults/openapi-operations` expects. A resolver returns
 * `null` when its credential is absent (the next accepted scheme is tried),
 * a principal when it verifies, and throws `OperationError` when a
 * credential is present but invalid.
 *
 * Access tokens are verified against the auth server's JWKS through
 * `@schemavaults/auth-server-sdk`'s `RouteGuardFactory` — the same
 * verification `withAuthenticatedApiRouteGuard` performs — which needs
 * `SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY` and
 * `SCHEMAVAULTS_AUTH_SERVER_URL` in the environment.
 */
import {
  RouteGuardFactory,
  getAppEnvironment,
  getSchemaVaultsAuthServerUrl,
  getSchemavaultsApiServerId,
  isUserInOrganization,
  loadJwksAccessPrivateKey,
  organizationIdSchema,
  type UserData,
} from "@schemavaults/auth-server-sdk";
import {
  OperationError,
  getCookie,
  type AuthPrincipal,
  type AuthResolver,
  type AuthResolvers,
} from "@schemavaults/openapi-operations";
import {
  accessTokenBearerScheme,
  accessTokenCookieScheme,
} from "./operation";
import type { ApiRequestContext } from "./request-context";

type TokenSource = Parameters<RouteGuardFactory["createGuardFromTokenSources"]>[1][number];

const JWKS_ACCESS_PRIVATE_KEY_ENV = "SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY";

function unauthorized(message: string): OperationError {
  return new OperationError(
    401,
    { error: "unauthorized", message },
    { "WWW-Authenticate": 'Bearer error="invalid_token"' },
  );
}

async function principalFromAccessToken(
  token: string,
  sourceHint: string,
  scheme: string,
): Promise<AuthPrincipal<UserData>> {
  if (!process.env[JWKS_ACCESS_PRIVATE_KEY_ENV]) {
    console.error(
      `[api/auth] ${JWKS_ACCESS_PRIVATE_KEY_ENV} is not set; access tokens cannot be verified.`,
    );
    throw new OperationError(500, {
      error: "internal_server_error",
      message: "Authentication is not configured on this server",
    });
  }

  const apiServerId = getSchemavaultsApiServerId();
  const factory = new RouteGuardFactory({ environment: getAppEnvironment() });
  const sources: TokenSource[] = [{ sourceHint, type: "access", token }];

  let guard: Awaited<ReturnType<RouteGuardFactory["createGuardFromTokenSources"]>>;
  try {
    guard = await factory.createGuardFromTokenSources("authenticated", sources, apiServerId);
  } catch (error) {
    console.warn(`[api/auth] access token from ${sourceHint} rejected:`, error);
    throw unauthorized("The access token is invalid or has expired");
  }

  const user = guard.user;
  if (!user || guard.revoked === true) {
    throw unauthorized("The access token is invalid or has been revoked");
  }

  return {
    scheme,
    user,
    isAdmin: user.admin === true,
    scope: guard.scope,
    getOrganizationRole: async (organizationId) => {
      const parsed = organizationIdSchema.safeParse(organizationId);
      if (!parsed.success) return false;
      return isUserInOrganization(
        getSchemaVaultsAuthServerUrl(),
        apiServerId,
        await loadJwksAccessPrivateKey(),
        user.uid,
        parsed.data,
      );
    },
  };
}

/** `Authorization: Bearer <access token>` */
const bearerResolver: AuthResolver<UserData, ApiRequestContext> = async (c, scheme) => {
  const header = c.req.header("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) {
    throw unauthorized("The Authorization header must be `Bearer <access token>`");
  }
  return principalFromAccessToken(token, "Authorization header", scheme.name);
};

/**
 * The cookie holds either the JSON `AccessToken` object written by the
 * SchemaVaults auth provider (`{ token, exp, ... }`) or a raw JWT.
 */
function accessTokenFromCookieValue(value: string): string | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "object" && parsed !== null && "token" in parsed) {
      const { token, exp } = parsed as { token?: unknown; exp?: unknown };
      if (typeof token !== "string" || token.length === 0) return null;
      if (typeof exp === "number" && Date.now() >= exp) return null;
      return token;
    }
    return null;
  } catch {
    return value.length > 0 ? value : null;
  }
}

/** First-party access-token cookie set by this app's own login flow. */
const cookieResolver: AuthResolver<UserData, ApiRequestContext> = async (c, scheme) => {
  const cookieName = scheme.securityScheme.name;
  if (!cookieName) return null;
  const value = getCookie(c, cookieName);
  if (!value) return null;
  const token = accessTokenFromCookieValue(value);
  if (!token) return null;
  return principalFromAccessToken(token, `cookie '${cookieName}'`, scheme.name);
};

export const schemaVaultsAuthResolvers: AuthResolvers<UserData, ApiRequestContext> = {
  [accessTokenBearerScheme.name]: bearerResolver,
  [accessTokenCookieScheme.name]: cookieResolver,
};
