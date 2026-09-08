import { createApiRoute } from "@/lib/api/create-api-route";
import { getHealth } from "./operations";

export const { GET } = createApiRoute(
  getHealth.implement(async ({ reply }) =>
    reply(200, { status: "ok", timestamp: new Date().toISOString() }),
  ),
);
