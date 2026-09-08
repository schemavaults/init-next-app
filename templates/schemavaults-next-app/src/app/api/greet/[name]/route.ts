import { createApiRoute } from "@/lib/api/create-api-route";
import { createGreeting, getGreeting } from "./operations";

export const { GET, POST } = createApiRoute(
  getGreeting.implement(async ({ params, query, reply }) => {
    const message = `${query.greeting}, ${params.name}!`;
    return reply(200, {
      message: query.shout ? message.toUpperCase() : message,
      name: params.name,
    });
  }),

  createGreeting.implement(async ({ params, body, reply }) =>
    reply(201, {
      message: `${body.greeting}, ${params.name}${body.punctuation}`,
      name: params.name,
    }),
  ),
);
