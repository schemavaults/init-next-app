/**
 * The subset of OpenAPI 3.x that `/docs` renders. Kept local (rather than
 * depending on `openapi3-ts`) so the docs page has no extra dependencies.
 */

export const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ReferenceObject {
  $ref: string;
}

export interface SchemaObject {
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, SchemaOrRef>;
  required?: string[];
  items?: SchemaOrRef;
  prefixItems?: SchemaOrRef[];
  additionalProperties?: boolean | SchemaOrRef;
  enum?: unknown[];
  const?: unknown;
  oneOf?: SchemaOrRef[];
  anyOf?: SchemaOrRef[];
  allOf?: SchemaOrRef[];
  not?: SchemaOrRef;
  nullable?: boolean;
  default?: unknown;
  example?: unknown;
  examples?: unknown[];
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  discriminator?: { propertyName: string; mapping?: Record<string, string> };
}

export type SchemaOrRef = SchemaObject | ReferenceObject;

export interface MediaTypeObject {
  schema?: SchemaOrRef;
  example?: unknown;
  examples?: Record<string, { summary?: string; value?: unknown } | ReferenceObject>;
}

export interface ParameterObject {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaOrRef;
  example?: unknown;
}

export interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

export interface HeaderObject {
  description?: string;
  required?: boolean;
  schema?: SchemaOrRef;
}

export interface ResponseObject {
  description?: string;
  headers?: Record<string, HeaderObject | ReferenceObject>;
  content?: Record<string, MediaTypeObject>;
}

export type SecurityRequirement = Record<string, string[]>;

export interface OperationObject {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: SecurityRequirement[];
  parameters?: Array<ParameterObject | ReferenceObject>;
  requestBody?: RequestBodyObject | ReferenceObject;
  responses?: Record<string, ResponseObject | ReferenceObject>;
}

export type PathItemObject = Partial<Record<HttpMethod, OperationObject>> & {
  summary?: string;
  description?: string;
  parameters?: Array<ParameterObject | ReferenceObject>;
};

export interface SecuritySchemeObject {
  type: string;
  description?: string;
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: string;
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    summary?: string;
    termsOfService?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name: string; url?: string };
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths?: Record<string, PathItemObject>;
  security?: SecurityRequirement[];
  components?: {
    schemas?: Record<string, SchemaOrRef>;
    securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>;
    parameters?: Record<string, ParameterObject | ReferenceObject>;
    requestBodies?: Record<string, RequestBodyObject | ReferenceObject>;
    responses?: Record<string, ResponseObject | ReferenceObject>;
    headers?: Record<string, HeaderObject | ReferenceObject>;
  };
}
