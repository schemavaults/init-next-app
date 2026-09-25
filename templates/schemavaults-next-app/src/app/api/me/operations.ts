import { authenticatedAccess, defineApiOperation, z } from "@/lib/api/operation";

export const CurrentUserSchema = z
  .object({
    uid: z.string().openapi({ example: "8d5d3a9e-6d2f-4d7e-9c1b-2f6a1d0e4b3c" }),
    email: z.string().openapi({ example: "ada@example.com" }),
    display_name: z.string().optional().openapi({ example: "Ada Lovelace" }),
    admin: z.boolean().openapi({ description: "Whether the user is a platform administrator." }),
  })
  .openapi("CurrentUser");

/**
 * Example of a protected operation: `authenticatedAccess()` accepts the
 * SchemaVaults access token as a bearer header or first-party cookie,
 * documents the security requirement and hands the handler a non-null
 * `ctx.auth.user`. Use `adminAccess()` to additionally require a platform
 * administrator, or pass `{ requiredScopes, organization }` for finer checks.
 */
export const getCurrentUser = defineApiOperation({
  method: "get",
  path: "/api/me",
  operationId: "getCurrentUser",
  summary: "Get the authenticated user",
  tags: ["Account"],
  auth: authenticatedAccess(),
  responses: {
    200: { description: "The caller's profile.", schema: CurrentUserSchema },
  },
  handler: (ctx) => {
    const user = ctx.auth.user;
    return ctx.json(200, {
      uid: user.uid,
      email: user.email,
      display_name: user.display_name,
      admin: user.admin === true,
    });
  },
});
