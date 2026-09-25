/**
 * The operations app factory shared by every `src/app/api/**\/route.ts`:
 * one small Hono app per Next.js route file, all validated against the
 * same catalogue, authenticated by the same resolvers and given the same
 * per-request context. Import this only from route handlers.
 */
import "server-only";

import {
  createOperationsAppFactory,
  operationHttpMethods,
  toNextRouteHandlers,
  type AnyOperationDefinition,
  type NextRouteHandlers,
} from "@schemavaults/openapi-operations";
import type { UserData } from "@schemavaults/auth-server-sdk";
import { createSchemaVaultsAuthResolvers } from "@schemavaults/auth-server-sdk/openapi-operations";
import { apiOperations } from "./operations";
import {
  ApiRequestContext,
  createApiRequestContext,
  disposeApiRequestContext,
} from "./request-context";

export const api = createOperationsAppFactory<ApiRequestContext, UserData>({
  operations: apiOperations,
  // Verifies bearer / cookie access tokens against the auth server's JWKS
  // (needs SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY and
  // SCHEMAVAULTS_AUTH_SERVER_URL at runtime; read on first request).
  authResolvers: createSchemaVaultsAuthResolvers<ApiRequestContext>(),
  context: createApiRequestContext,
  disposeContext: disposeApiRequestContext,
  onError: (error, c, { operation }) => {
    console.error(
      `[api] ${operation.operationId} (${c.req.method} ${c.req.path}) failed:`,
      error,
    );
  },
});

/**
 * Next.js route-handler exports for the operations served at one path:
 *
 * ```ts
 * // src/app/api/items/[id]/route.ts
 * export const { GET, DELETE } = apiRoute([getItem, deleteItem]);
 * ```
 *
 * Only the methods the operations declare are exported, so Next.js answers
 * 405 for the others. Throws at module load if an operation is not in the
 * catalogue (`./operations.ts`).
 */
export function apiRoute(operations: readonly AnyOperationDefinition[]): NextRouteHandlers {
  return toNextRouteHandlers(api.app(operations), operationHttpMethods(operations));
}
