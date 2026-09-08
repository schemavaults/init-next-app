/**
 * Builds the OpenAPI 3.1 document from a list of API operations.
 * Pure module: used by `scripts/generate-openapi.ts` (bun) to write
 * `public/openapi.json`, which `/docs` and `/openapi.json` serve.
 */
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import {
  API_HTTP_METHODS,
  BEARER_AUTH_SECURITY_SCHEME,
  type AnyApiOperation,
} from "./define";

export interface OpenApiDocumentInfo {
  title: string;
  version: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
}

export type OpenApiDocument = ReturnType<
  OpenApiGeneratorV31["generateDocument"]
>;

/** Deterministic ordering so the generated JSON is stable across runs. */
export function sortApiOperations(
  operations: readonly AnyApiOperation[],
): AnyApiOperation[] {
  const methodOrder = (m: string): number =>
    (API_HTTP_METHODS as readonly string[]).indexOf(m);
  return [...operations].sort(
    (a, b) =>
      a.path.localeCompare(b.path) || methodOrder(a.method) - methodOrder(b.method),
  );
}

export function buildOpenApiDocument(
  operations: readonly AnyApiOperation[],
  info: OpenApiDocumentInfo,
): OpenApiDocument {
  const registry = new OpenAPIRegistry();

  registry.registerComponent("securitySchemes", BEARER_AUTH_SECURITY_SCHEME, {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "SchemaVaults access token. Browser sessions send it automatically as a cookie; " +
      "other clients send `Authorization: Bearer <access token>`.",
  });

  const tags = new Set<string>();
  for (const operation of sortApiOperations(operations)) {
    for (const tag of operation.config.tags ?? []) tags.add(tag);
    registry.registerPath(operation.toRouteConfig());
  }

  const generator = new OpenApiGeneratorV31(registry.definitions, {
    sortComponents: "alphabetically",
  });

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: info.title,
      version: info.version,
      ...(info.description ? { description: info.description } : {}),
    },
    ...(info.servers ? { servers: info.servers } : {}),
    ...(tags.size > 0
      ? { tags: [...tags].sort().map((name) => ({ name })) }
      : {}),
  });
}
