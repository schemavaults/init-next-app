import { defineApiOperation, z } from "@/lib/api/define";

export const CurrentUserSchema = z
  .object({
    uid: z.string().openapi({ example: "8d5d3a9e-6d2f-4d7e-9c1b-2f6a1d0e4b3c" }),
    email: z.string().openapi({ example: "ada@example.com" }),
    display_name: z.string().optional().openapi({ example: "Ada Lovelace" }),
    admin: z.boolean().openapi({ description: "Whether the user is an administrator." }),
  })
  .openapi("CurrentUser");

/**
 * Example of a protected operation: `access: "authenticated"` runs the
 * SchemaVaults auth route guard before the handler, documents the bearer
 * security requirement plus the 401 response, and hands the handler
 * `auth.user`. Use `access: "admin"` to additionally require an admin.
 */
export const getCurrentUser = defineApiOperation({
  method: "get",
  path: "/api/me",
  operationId: "getCurrentUser",
  summary: "Get the authenticated user",
  tags: ["Account"],
  access: "authenticated",
  responses: {
    200: { description: "The caller's profile.", schema: CurrentUserSchema },
  },
});
