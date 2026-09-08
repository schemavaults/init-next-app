/**
 * Turns API operation implementations into a Next.js route handler module.
 *
 * Every `src/app/api/**\/route.ts` gets its own Hono app: one app per
 * Next.js route, with one Hono route per HTTP method. Requests are validated
 * against the operation's zod schemas, protected operations run behind the
 * SchemaVaults auth route guards, and errors are normalised into the
 * `ApiErrorResponse` envelope.
 *
 * @example
 * // src/app/api/items/[id]/route.ts
 * import { createApiRoute } from "@/lib/api/create-api-route";
 * import { getItem, deleteItem } from "./operations";
 *
 * export const { GET, DELETE } = createApiRoute(
 *   getItem.implement(async ({ params, reply }) => reply(200, await load(params.id))),
 *   deleteItem.implement(async ({ params, auth, reply }) => { ...; return reply(204); }),
 * );
 */
import "server-only";

import { Hono, type Context } from "hono";
import { handle } from "hono/vercel";
import { NextRequest, NextResponse } from "next/server";
import {
  withAdminApiRouteGuard,
  withAuthenticatedApiRouteGuard,
} from "@schemavaults/auth-server-sdk/route_guards";
import type {
  AnyApiOperation,
  AnyApiOperationImplementation,
  ApiAuthContext,
  ApiHttpMethod,
  ApiReplyFn,
  ApiReplyInit,
  ApiResponsesConfig,
} from "./define";
import {
  ApiError,
  apiErrorResponse,
  invalidJsonResponse,
  validationErrorResponse,
} from "./error-response";

export type { ApiHandlerContext } from "./define";

/** The signature Next.js expects from `export const GET = ...` in a route.ts. */
export type NextRouteHandler = (
  request: Request,
) => Response | Promise<Response>;

export type ApiRouteHandlers<TMethod extends ApiHttpMethod> = {
  readonly [M in Uppercase<TMethod>]: NextRouteHandler;
} & {
  /** The Hono app behind this route, e.g. to add middleware in tests. */
  readonly app: Hono;
};

type MethodsOf<T extends readonly AnyApiOperationImplementation[]> =
  T[number]["operation"]["method"];

/**
 * Create the Hono app for one Next.js route and return its method handlers.
 * All implementations must share the same `path` (the route's directory).
 */
export function createApiRoute<
  const T extends readonly [
    AnyApiOperationImplementation,
    ...AnyApiOperationImplementation[],
  ],
>(...implementations: T): ApiRouteHandlers<MethodsOf<T>> {
  const path = implementations[0].operation.path;
  const app = new Hono();
  const seenMethods = new Set<ApiHttpMethod>();

  app.onError((error, c) => handleError(error, c));

  for (const implementation of implementations) {
    const operation = implementation.operation;
    if (operation.path !== path) {
      throw new Error(
        `createApiRoute: every operation in a route.ts must share one path; ` +
          `got '${operation.path}' (${operation.operationId}) alongside '${path}'`,
      );
    }
    if (seenMethods.has(operation.method)) {
      throw new Error(
        `createApiRoute: method '${operation.method}' is implemented twice for '${path}'`,
      );
    }
    seenMethods.add(operation.method);

    app.on(operation.method.toUpperCase(), operation.honoPath, (c) =>
      dispatch(implementation, c),
    );
  }

  const handler: NextRouteHandler = handle(app);
  const handlers: Record<string, unknown> = { app };
  for (const method of seenMethods) {
    handlers[method.toUpperCase()] = handler;
  }
  return handlers as ApiRouteHandlers<MethodsOf<T>>;
}

async function dispatch(
  implementation: AnyApiOperationImplementation,
  c: Context,
): Promise<Response> {
  const operation: AnyApiOperation = implementation.operation;
  if (operation.access === "public") {
    return runValidatedHandler(implementation, c, c.req.raw, null);
  }

  const guard =
    operation.access === "admin"
      ? withAdminApiRouteGuard
      : withAuthenticatedApiRouteGuard;

  // The guard needs a NextRequest (cookies). Constructing one from the raw
  // request transfers the body stream, so the handler must read the body
  // from `inputs.req`, not from `c.req`.
  const guarded = guard(async ({ req, ...auth }) => {
    const response = await runValidatedHandler(implementation, c, req, auth);
    return toNextResponse(response);
  });
  return guarded(new NextRequest(c.req.raw));
}

async function runValidatedHandler(
  implementation: AnyApiOperationImplementation,
  c: Context,
  request: Request,
  auth: ApiAuthContext | null,
): Promise<Response> {
  const operation: AnyApiOperation = implementation.operation;
  const { params: paramsSchema, query: querySchema, body: bodySchema } =
    operation.config.request ?? {};

  let params: unknown = undefined;
  if (paramsSchema) {
    const parsed = paramsSchema.safeParse(c.req.param());
    if (!parsed.success) return validationErrorResponse("params", parsed.error);
    params = parsed.data;
  }

  let query: unknown = undefined;
  if (querySchema) {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse("query", parsed.error);
    query = parsed.data;
  }

  let body: unknown = undefined;
  if (bodySchema) {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return invalidJsonResponse();
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return validationErrorResponse("body", parsed.error);
    body = parsed.data;
  }

  try {
    return await implementation.handler({
      params,
      query,
      body,
      auth,
      request,
      c,
      reply: createReply(operation),
    });
  } catch (error) {
    // Errors thrown inside the auth guard's callback would otherwise be
    // swallowed by the guard; normalise them here as well as in app.onError.
    return handleError(error, c);
  }
}

function createReply(operation: AnyApiOperation): ApiReplyFn<ApiResponsesConfig> {
  const declared = new Map(operation.allResponses);
  return ((status: number, ...args: unknown[]): Response => {
    const response = declared.get(status);
    if (!response) {
      throw new Error(
        `${operation.operationId}: reply(${status}) is not declared in the operation's responses`,
      );
    }
    const hasBody = response.schema !== undefined;
    const body = hasBody ? args[0] : undefined;
    const init = (hasBody ? args[1] : args[0]) as ApiReplyInit | undefined;

    if (hasBody && process.env.NODE_ENV !== "production") {
      // Catch response/schema drift during development; skipped in
      // production so a stale schema can never take a working route down.
      const parsed = response.schema!.safeParse(body);
      if (!parsed.success) {
        throw new Error(
          `${operation.operationId}: reply(${status}) body does not match the declared response schema:\n` +
            parsed.error.issues
              .map((i) => `  - ${i.path.map(String).join(".") || "<root>"}: ${i.message}`)
              .join("\n"),
        );
      }
    }

    const headers = new Headers(init?.headers);
    if (!hasBody) {
      return new Response(null, { status, headers });
    }
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json; charset=utf-8");
    }
    return new Response(JSON.stringify(body), { status, headers });
  }) as ApiReplyFn<ApiResponsesConfig>;
}

function handleError(error: unknown, c: Context): Response {
  if (error instanceof ApiError) {
    return error.toResponse();
  }
  console.error(`[api] ${c.req.method} ${c.req.path} failed:`, error);
  return apiErrorResponse(500, "internal_error", "Internal Server Error");
}

function toNextResponse(response: Response): NextResponse {
  if (response instanceof NextResponse) return response;
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
