/**
 * Error response schemas and helpers shared by every API operation.
 * Pure module: safe to import from `operations.ts` files and from the
 * OpenAPI generator script.
 */
import { z } from "./zod";

export const API_ERROR_CODES = [
  "validation_error",
  "invalid_json",
  "not_found",
  "conflict",
  "internal_error",
] as const;

export const ApiErrorIssueSchema = z
  .object({
    path: z.string().openapi({
      description:
        "Dotted location of the invalid value, prefixed with `params`, `query` or `body`.",
      example: "body.email",
    }),
    message: z.string().openapi({ example: "Invalid email address" }),
  })
  .openapi("ApiErrorIssue");

export const ApiErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({
        description: `Machine-readable error code, e.g. ${API_ERROR_CODES.map((c) => `\`${c}\``).join(", ")}.`,
        example: "validation_error",
      }),
      message: z.string().openapi({ example: "Request validation failed" }),
      issues: z.array(ApiErrorIssueSchema).optional().openapi({
        description: "Present for `validation_error` responses.",
      }),
    }),
  })
  .openapi("ApiErrorResponse", {
    description: "Error envelope returned by every API operation.",
  });

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/** Shape of the 401/403 responses produced by the SchemaVaults auth route guards. */
export const AuthErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: z.literal(true),
    message: z.string().openapi({
      example: "Authentication failed, no token sources found for request",
    }),
  })
  .openapi("AuthErrorResponse", {
    description:
      "Returned by the SchemaVaults auth guard when the caller is not authenticated or not authorized.",
  });

export type AuthErrorResponse = z.infer<typeof AuthErrorResponseSchema>;

/**
 * Throw from a handler to send a structured error response, e.g.
 * `throw new ApiError(404, "not_found", "No item with that id")`.
 * Remember to declare the status in the operation's `responses` (with
 * `ApiErrorResponseSchema`) so it shows up in the OpenAPI document.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: ApiErrorResponse["error"]["issues"];

  constructor(
    status: number,
    code: string,
    message: string,
    issues?: ApiErrorResponse["error"]["issues"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }

  toResponse(): Response {
    return apiErrorResponse(this.status, this.code, this.message, this.issues);
  }
}

export function apiErrorResponse(
  status: number,
  code: string,
  message: string,
  issues?: ApiErrorResponse["error"]["issues"],
): Response {
  const body: ApiErrorResponse = {
    error: { code, message, ...(issues ? { issues } : {}) },
  };
  return Response.json(body, { status });
}

export type ApiRequestLocation = "params" | "query" | "body";

export function validationErrorResponse(
  location: ApiRequestLocation,
  error: z.ZodError,
): Response {
  const issues = error.issues.map((issue) => ({
    path: [location, ...issue.path.map(String)].join("."),
    message: issue.message,
  }));
  return apiErrorResponse(
    400,
    "validation_error",
    `Request ${location} failed validation`,
    issues,
  );
}

export function invalidJsonResponse(): Response {
  return apiErrorResponse(
    400,
    "invalid_json",
    "Request body must be valid JSON (Content-Type: application/json)",
  );
}
