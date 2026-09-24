/**
 * Builds the OpenAPI 3.1 document for the whole catalogue. Used by
 * `scripts/generate-openapi.ts` (writes `public/openapi.json`) and by the
 * `/docs` pages (rendered live, so they can never lag behind the code).
 */
import {
  buildOpenApiDocument,
  isPublicOperationAuth,
  type AnyOperationDefinition,
  type OpenAPIObject,
  type ResponseDefinition,
} from "@schemavaults/openapi-operations";
import { ApiErrorResponseSchema } from "./operation";
import { openApiInfo } from "./openapi-info";
import { apiOperations } from "./operations";

/**
 * Responses the operations runtime produces on its own, added to the
 * document for every operation that can trigger them. Declared responses
 * for the same status take precedence.
 */
export function runtimeErrorResponses(
  operation: AnyOperationDefinition,
): Record<number, ResponseDefinition> {
  const responses: Record<number, ResponseDefinition> = {};
  const { params, query, headers, body } = operation.request;
  const validatesBody = body !== undefined && body.documentOnly !== true;

  if (params || query || headers || validatesBody) {
    responses[400] = {
      description: "The path parameters, query string, headers or body failed validation.",
      schema: ApiErrorResponseSchema,
    };
  }
  if (!isPublicOperationAuth(operation.auth)) {
    responses[401] = {
      description: "No credential was presented, or it is invalid or expired.",
      schema: ApiErrorResponseSchema,
    };
    const { routeGuard, requiredScopes, organization } = operation.auth;
    if (routeGuard === "admin" || (requiredScopes?.length ?? 0) > 0 || organization) {
      responses[403] = {
        description: "The caller is authenticated but not allowed to perform this operation.",
        schema: ApiErrorResponseSchema,
      };
    }
  }
  if (validatesBody) {
    responses[415] = {
      description: `The request body is not \`${body.contentType ?? "application/json"}\`.`,
      schema: ApiErrorResponseSchema,
    };
  }
  responses[500] = {
    description: "Unexpected server error.",
    schema: ApiErrorResponseSchema,
  };
  return responses;
}

function withRuntimeErrorResponses(operation: AnyOperationDefinition): AnyOperationDefinition {
  return {
    ...operation,
    handler: operation.handler,
    responses: { ...runtimeErrorResponses(operation), ...operation.responses },
  };
}

let cached: OpenAPIObject | undefined;

export function getOpenApiDocument(): OpenAPIObject {
  cached ??= buildOpenApiDocument({
    ...openApiInfo,
    operations: apiOperations.map(withRuntimeErrorResponses),
  });
  return cached;
}
