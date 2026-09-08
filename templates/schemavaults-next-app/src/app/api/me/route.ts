import { createApiRoute } from "@/lib/api/create-api-route";
import { getCurrentUser } from "./operations";

export const { GET } = createApiRoute(
  getCurrentUser.implement(async ({ auth, reply }) =>
    reply(200, {
      uid: auth.user.uid,
      email: auth.user.email,
      display_name: auth.user.display_name,
      admin: auth.user.admin === true,
    }),
  ),
);
