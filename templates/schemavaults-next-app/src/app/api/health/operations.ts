import { defineApiOperation, publicAccess, z } from "@/lib/api/operation";

export const HealthResponseSchema = z
  .object({
    status: z.literal("ok"),
    timestamp: z.iso.datetime().openapi({
      description: "Server time when the check ran (ISO 8601).",
      example: "2025-01-01T00:00:00.000Z",
    }),
  })
  .openapi("HealthResponse");

export const getHealth = defineApiOperation({
  method: "get",
  path: "/api/health",
  operationId: "getHealth",
  summary: "Health check",
  description: "Liveness probe for load balancers and uptime monitors.",
  tags: ["System"],
  auth: publicAccess(),
  responses: {
    200: { description: "The service is up.", schema: HealthResponseSchema },
  },
  handler: (ctx) => ctx.json(200, { status: "ok", timestamp: new Date().toISOString() }),
});
