/**
 * Builds the OpenAPI 3.1 document for the whole catalogue. Used by
 * `scripts/generate-openapi.ts` (writes `public/openapi.json`) and by the
 * `/docs` pages (rendered live, so they can never lag behind the code).
 */
import { buildOpenApiDocument, type OpenAPIObject } from "@schemavaults/openapi-operations";
import { openApiInfo } from "./openapi-info";
import { apiOperations } from "./operations";

let cached: OpenAPIObject | undefined;

export function getOpenApiDocument(): OpenAPIObject {
  cached ??= buildOpenApiDocument({
    ...openApiInfo,
    operations: apiOperations,
    // Also list the 400 / 401 / 403 / 415 / 500 responses the operations
    // runtime produces on its own (declared responses take precedence).
    documentRuntimeResponses: true,
  });
  return cached;
}
