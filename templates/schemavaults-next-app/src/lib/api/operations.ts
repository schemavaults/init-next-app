/**
 * The API catalogue: every operation this app serves. `buildOpenApiDocument`
 * (via `scripts/generate-openapi.ts` and `/docs`) and the operations app
 * factory (`./api.ts`) are both fed from this list, so a route file cannot
 * serve an operation the document does not describe.
 *
 * Add every new operation exported from a `src/app/api/**\/operations.ts`
 * here; `bun run openapi:check` fails when one is missing.
 */
import type { AnyOperationDefinition } from "@schemavaults/openapi-operations";
import { getHealth } from "@/app/api/health/operations";
import { createGreeting, getGreeting } from "@/app/api/greet/[name]/operations";
import { getCurrentUser } from "@/app/api/me/operations";

export const apiOperations: readonly AnyOperationDefinition[] = [
  getHealth,
  getGreeting,
  createGreeting,
  getCurrentUser,
];
