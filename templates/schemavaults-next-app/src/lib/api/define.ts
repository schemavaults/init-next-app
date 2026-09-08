/**
 * Pure API operation definitions.
 *
 * This module has NO server-side dependencies (no `server-only`, no Hono, no
 * database, no auth SDK at runtime) so that `operations.ts` files can be
 * imported both by Next.js route handlers and by
 * `scripts/generate-openapi.ts`, which produces `public/openapi.json`.
 *
 * Define an operation with {@link defineApiOperation} in an `operations.ts`
 * file next to the `route.ts` that implements it, then implement it with
 * `createApiRoute(operation.implement(handler))` from `./create-api-route`.
 * See `.claude/skills/api-routes/SKILL.md` for the full workflow.
 */

import type { RouteConfig } from "@asteasolutions/zod-to-openapi";
import { z } from "./zod";
import type { Context } from "hono";
import type { IBaseProtectedAuthenticatedApiRouteInputs } from "@schemavaults/auth-server-sdk/route_guards";
import {
  ApiErrorResponseSchema,
  AuthErrorResponseSchema,
} from "./error-response";

// `z` from "./zod" has the `.openapi()` extension installed. Import it from
// here (rather than from "zod") in operations files.
export { z };

/** Name of the `components.securitySchemes` entry used by protected operations. */
export const BEARER_AUTH_SECURITY_SCHEME = "bearerAuth" as const;

export const API_HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
] as const;
export type ApiHttpMethod = (typeof API_HTTP_METHODS)[number];

/**
 * Who may call an operation.
 * - `public`: no authentication.
 * - `authenticated`: a valid SchemaVaults access token (cookie or
 *   `Authorization: Bearer`) is required; the handler receives `auth.user`.
 * - `admin`: like `authenticated`, and the user must be an admin.
 */
export type ApiAccess = "public" | "authenticated" | "admin";

/**
 * Every operation lives under `/api/` and uses OpenAPI-style path parameters,
 * e.g. `/api/items/{id}`. The path must match the directory of the
 * `operations.ts` file that defines it (`src/app/api/items/[id]/`).
 */
export type ApiPath = `/api/${string}`;

export type ApiParamsSchema = z.ZodObject;
export type ApiQuerySchema = z.ZodObject;
export type ApiBodySchema = z.ZodType;

export interface ApiRequestConfig<
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
> {
  /** Path parameters. Keys must match the `{name}` placeholders in `path`. */
  params?: TParams;
  /** Query string parameters. Values arrive as strings; use `z.coerce.*`. */
  query?: TQuery;
  /** JSON request body (`application/json`). */
  body?: TBody;
  /** Description of the request body shown in the OpenAPI document. */
  bodyDescription?: string;
}

export interface ApiResponseConfig {
  description: string;
  /** JSON response body schema. Omit for responses without a body (204). */
  schema?: z.ZodType;
}

export type ApiResponsesConfig = Readonly<Record<number, ApiResponseConfig>>;

export interface ApiOperationConfig<
  TMethod extends ApiHttpMethod,
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
  TResponses extends ApiResponsesConfig,
  TAccess extends ApiAccess,
> {
  method: TMethod;
  path: ApiPath;
  /** Unique across the whole API. camelCase verb + noun, e.g. `listItems`. */
  operationId: string;
  summary: string;
  description?: string;
  tags?: readonly string[];
  deprecated?: boolean;
  /** Defaults to `"public"`. */
  access?: TAccess;
  request?: ApiRequestConfig<TParams, TQuery, TBody>;
  /** Success (and any custom error) responses keyed by HTTP status code. */
  responses: TResponses;
}

type InferSchema<T> = T extends z.ZodType ? z.output<T> : undefined;

type ResponseStatus<TResponses extends ApiResponsesConfig> = Extract<
  keyof TResponses,
  number
>;

type ResponseBody<
  TResponses extends ApiResponsesConfig,
  S extends keyof TResponses,
> = TResponses[S] extends { schema: infer Z }
  ? Z extends z.ZodType
    ? z.output<Z>
    : undefined
  : undefined;

export interface ApiReplyInit {
  headers?: HeadersInit;
}

/**
 * Typed response helper: `reply(200, body)` only accepts status codes declared
 * in `responses`, and a body matching that status's schema.
 */
export type ApiReplyFn<TResponses extends ApiResponsesConfig> = <
  S extends ResponseStatus<TResponses>,
>(
  status: S,
  ...args: ResponseBody<TResponses, S> extends undefined
    ? [init?: ApiReplyInit]
    : [body: ResponseBody<TResponses, S>, init?: ApiReplyInit]
) => Response;

/** What the auth guard resolved for `authenticated` / `admin` operations. */
export type ApiAuthContext = Omit<IBaseProtectedAuthenticatedApiRouteInputs, "req">;

type AuthFor<TAccess extends ApiAccess> = TAccess extends "public"
  ? null
  : ApiAuthContext;

export interface ApiHandlerContext<
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
  TResponses extends ApiResponsesConfig,
  TAccess extends ApiAccess,
> {
  /** Validated path parameters (`undefined` when the operation declares none). */
  params: InferSchema<TParams>;
  /** Validated query parameters (`undefined` when the operation declares none). */
  query: InferSchema<TQuery>;
  /** Validated JSON body (`undefined` when the operation declares none). */
  body: InferSchema<TBody>;
  /** `null` for public operations, otherwise the authenticated user. */
  auth: AuthFor<TAccess>;
  /** The raw incoming request. */
  request: Request;
  /** The Hono context, for headers, cookies, streaming, redirects, etc. */
  c: Context;
  /** Typed JSON response helper; see {@link ApiReplyFn}. */
  reply: ApiReplyFn<TResponses>;
}

export type ApiHandler<
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
  TResponses extends ApiResponsesConfig,
  TAccess extends ApiAccess,
> = (
  ctx: ApiHandlerContext<TParams, TQuery, TBody, TResponses, TAccess>,
) => Promise<Response> | Response;

export interface ApiOperationImplementation<
  TMethod extends ApiHttpMethod,
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
  TResponses extends ApiResponsesConfig,
  TAccess extends ApiAccess,
> {
  operation: ApiOperation<TMethod, TParams, TQuery, TBody, TResponses, TAccess>;
  handler: ApiHandler<TParams, TQuery, TBody, TResponses, TAccess>;
}

export type AnyApiOperation = ApiOperation<
  ApiHttpMethod,
  ApiParamsSchema | undefined,
  ApiQuerySchema | undefined,
  ApiBodySchema | undefined,
  ApiResponsesConfig,
  ApiAccess
>;

// `any` is required here: handler parameters are contravariant, so a
// union/unknown would reject every concrete implementation.
export type AnyApiOperationImplementation = ApiOperationImplementation<
  ApiHttpMethod,
  any,
  any,
  any,
  any,
  any
>;

const API_OPERATION_BRAND: unique symbol = Symbol.for(
  "schemavaults.init-next-app.ApiOperation",
);

const PATH_PARAM_RE = /\{([^{}/]+)\}/g;

export class ApiOperation<
  TMethod extends ApiHttpMethod,
  TParams extends ApiParamsSchema | undefined,
  TQuery extends ApiQuerySchema | undefined,
  TBody extends ApiBodySchema | undefined,
  TResponses extends ApiResponsesConfig,
  TAccess extends ApiAccess,
> {
  readonly [API_OPERATION_BRAND] = true;
  readonly config: ApiOperationConfig<
    TMethod,
    TParams,
    TQuery,
    TBody,
    TResponses,
    TAccess
  >;

  constructor(
    config: ApiOperationConfig<
      TMethod,
      TParams,
      TQuery,
      TBody,
      TResponses,
      TAccess
    >,
  ) {
    ApiOperation.assertValidConfig(config);
    this.config = config;
  }

  /** Brand check that survives duplicate module instances (bun script vs Next bundle). */
  static isApiOperation(value: unknown): value is AnyApiOperation {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as Record<PropertyKey, unknown>)[API_OPERATION_BRAND] === true
    );
  }

  private static assertValidConfig(
    config: ApiOperationConfig<
      ApiHttpMethod,
      ApiParamsSchema | undefined,
      ApiQuerySchema | undefined,
      ApiBodySchema | undefined,
      ApiResponsesConfig,
      ApiAccess
    >,
  ): void {
    const label = `API operation '${config.operationId || "<missing operationId>"}'`;
    if (!config.operationId || !/^[A-Za-z][A-Za-z0-9_]*$/.test(config.operationId)) {
      throw new Error(
        `${label}: operationId must be a non-empty identifier (letters, digits, underscores)`,
      );
    }
    if (!(API_HTTP_METHODS as readonly string[]).includes(config.method)) {
      throw new Error(`${label}: unsupported method '${String(config.method)}'`);
    }
    if (!config.path.startsWith("/api/") || config.path.endsWith("/")) {
      throw new Error(
        `${label}: path must start with '/api/' and not end with '/', got '${config.path}'`,
      );
    }
    if (!config.summary) {
      throw new Error(`${label}: summary is required`);
    }
    const pathParams = ApiOperation.extractPathParameterNames(config.path);
    const schemaParams = config.request?.params
      ? Object.keys(config.request.params.shape)
      : [];
    const missingFromSchema = pathParams.filter((p) => !schemaParams.includes(p));
    const missingFromPath = schemaParams.filter((p) => !pathParams.includes(p));
    if (missingFromSchema.length > 0 || missingFromPath.length > 0) {
      throw new Error(
        `${label}: request.params must declare exactly the path parameters of '${config.path}'.` +
          (missingFromSchema.length > 0
            ? ` Missing from schema: ${missingFromSchema.join(", ")}.`
            : "") +
          (missingFromPath.length > 0
            ? ` Not in path: ${missingFromPath.join(", ")}.`
            : ""),
      );
    }
    const statuses = Object.keys(config.responses);
    if (statuses.length === 0) {
      throw new Error(`${label}: at least one response must be declared`);
    }
    for (const status of statuses) {
      const code = Number(status);
      if (!Number.isInteger(code) || code < 100 || code > 599) {
        throw new Error(`${label}: invalid response status code '${status}'`);
      }
    }
  }

  static extractPathParameterNames(path: string): string[] {
    return Array.from(path.matchAll(PATH_PARAM_RE), (m) => m[1]);
  }

  get method(): TMethod {
    return this.config.method;
  }

  get path(): ApiPath {
    return this.config.path;
  }

  get operationId(): string {
    return this.config.operationId;
  }

  get access(): ApiAccess {
    return this.config.access ?? "public";
  }

  get pathParameterNames(): string[] {
    return ApiOperation.extractPathParameterNames(this.config.path);
  }

  /** The route path in Hono syntax (`/api/items/:id`). */
  get honoPath(): string {
    return this.config.path.replace(PATH_PARAM_RE, ":$1");
  }

  /**
   * Pair this definition with its handler. Pass the result to
   * `createApiRoute()` in the sibling `route.ts`.
   */
  implement(
    handler: ApiHandler<TParams, TQuery, TBody, TResponses, TAccess>,
  ): ApiOperationImplementation<
    TMethod,
    TParams,
    TQuery,
    TBody,
    TResponses,
    TAccess
  > {
    return { operation: this, handler };
  }

  /**
   * Error responses every operation gets for free, based on what it declares.
   * Explicitly declared responses for the same status take precedence.
   */
  get implicitResponses(): Record<number, ApiResponseConfig> {
    const responses: Record<number, ApiResponseConfig> = {};
    const request = this.config.request;
    if (request?.params || request?.query || request?.body) {
      responses[400] = {
        description:
          "The path parameters, query string or JSON body failed validation.",
        schema: ApiErrorResponseSchema,
      };
    }
    if (this.access !== "public") {
      responses[401] = {
        description: "Missing, expired or invalid access token.",
        schema: AuthErrorResponseSchema,
      };
    }
    if (this.access === "admin") {
      responses[403] = {
        description: "The authenticated user is not an administrator.",
        schema: AuthErrorResponseSchema,
      };
    }
    responses[500] = {
      description: "Unexpected server error.",
      schema: ApiErrorResponseSchema,
    };
    return responses;
  }

  /** All responses (implicit + declared), sorted by status code. */
  get allResponses(): Array<[number, ApiResponseConfig]> {
    const merged: Record<number, ApiResponseConfig> = {
      ...this.implicitResponses,
      ...this.config.responses,
    };
    return Object.entries(merged)
      .map(([status, response]) => [Number(status), response] as [number, ApiResponseConfig])
      .sort(([a], [b]) => a - b);
  }

  /** Convert to the `RouteConfig` consumed by `@asteasolutions/zod-to-openapi`. */
  toRouteConfig(): RouteConfig {
    const { request } = this.config;
    const responses: RouteConfig["responses"] = {};
    for (const [status, response] of this.allResponses) {
      responses[String(status)] = {
        description: response.description,
        ...(response.schema
          ? { content: { "application/json": { schema: response.schema } } }
          : {}),
      };
    }

    const routeRequest: NonNullable<RouteConfig["request"]> = {};
    if (request?.params) routeRequest.params = request.params;
    if (request?.query) routeRequest.query = request.query;
    if (request?.body) {
      routeRequest.body = {
        description: request.bodyDescription,
        required: true,
        content: { "application/json": { schema: request.body } },
      };
    }

    return {
      method: this.config.method,
      path: this.config.path,
      operationId: this.config.operationId,
      summary: this.config.summary,
      ...(this.config.description ? { description: this.config.description } : {}),
      ...(this.config.tags?.length ? { tags: [...this.config.tags] } : {}),
      ...(this.config.deprecated ? { deprecated: true } : {}),
      ...(this.access !== "public"
        ? { security: [{ [BEARER_AUTH_SECURITY_SCHEME]: [] }] }
        : {}),
      ...(Object.keys(routeRequest).length > 0 ? { request: routeRequest } : {}),
      responses,
    };
  }
}

/**
 * Define an API operation (one HTTP method on one path). Put the definition in
 * `src/app/api/<path>/operations.ts` and implement it in the sibling
 * `route.ts` with `createApiRoute(operation.implement(handler))`.
 *
 * @example
 * export const getItem = defineApiOperation({
 *   method: "get",
 *   path: "/api/items/{id}",
 *   operationId: "getItem",
 *   summary: "Get an item",
 *   tags: ["Items"],
 *   request: { params: z.object({ id: z.string().uuid() }) },
 *   responses: {
 *     200: { description: "The item", schema: ItemSchema },
 *     404: { description: "No such item", schema: ApiErrorResponseSchema },
 *   },
 * });
 */
export function defineApiOperation<
  TMethod extends ApiHttpMethod,
  const TResponses extends ApiResponsesConfig,
  TParams extends ApiParamsSchema | undefined = undefined,
  TQuery extends ApiQuerySchema | undefined = undefined,
  TBody extends ApiBodySchema | undefined = undefined,
  TAccess extends ApiAccess = "public",
>(
  config: ApiOperationConfig<
    TMethod,
    TParams,
    TQuery,
    TBody,
    TResponses,
    TAccess
  >,
): ApiOperation<TMethod, TParams, TQuery, TBody, TResponses, TAccess> {
  return new ApiOperation(config);
}
