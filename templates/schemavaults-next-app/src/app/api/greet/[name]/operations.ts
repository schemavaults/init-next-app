import { defineApiOperation, publicAccess, z } from "@/lib/api/operation";

/**
 * Example operations showing path parameters, query parameters and a JSON
 * body. Delete this directory (and the entries in `src/lib/api/operations.ts`)
 * once you have real routes, then run `bun run openapi:generate`.
 */

const NameParams = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .openapi({ description: "Who to greet.", example: "Ada" }),
});

export const GreetingSchema = z
  .object({
    message: z.string().openapi({ example: "Hello, Ada!" }),
    name: z.string().openapi({ example: "Ada" }),
  })
  .openapi("Greeting");

export const getGreeting = defineApiOperation({
  method: "get",
  path: "/api/greet/{name}",
  operationId: "getGreeting",
  summary: "Greet someone",
  description: "Builds a greeting from a path parameter and optional query parameters.",
  tags: ["Examples"],
  auth: publicAccess(),
  request: {
    params: NameParams,
    query: z.object({
      greeting: z.string().min(1).max(32).default("Hello").openapi({
        description: "The salutation to use.",
        example: "Howdy",
      }),
      // Query values arrive as strings (string[] for repeated keys); coerce
      // anything that is not a string.
      shout: z
        .enum(["true", "false"])
        .default("false")
        .transform((value) => value === "true")
        .openapi({ description: "Upper-case the whole message." }),
    }),
  },
  responses: {
    200: { description: "The greeting.", schema: GreetingSchema },
  },
  handler: (ctx) => {
    const message = `${ctx.query.greeting}, ${ctx.params.name}!`;
    return ctx.json(200, {
      message: ctx.query.shout ? message.toUpperCase() : message,
      name: ctx.params.name,
    });
  },
});

export const createGreeting = defineApiOperation({
  method: "post",
  path: "/api/greet/{name}",
  operationId: "createGreeting",
  summary: "Greet someone with a custom salutation",
  tags: ["Examples"],
  auth: publicAccess(),
  request: {
    params: NameParams,
    body: {
      description: "How to greet the named person.",
      schema: z
        .object({
          greeting: z.string().min(1).max(32).openapi({ example: "Good morning" }),
          punctuation: z.enum(["!", ".", "?"]).default("!"),
        })
        .openapi("CreateGreetingRequest"),
    },
  },
  responses: {
    201: { description: "The greeting.", schema: GreetingSchema },
  },
  handler: (ctx) =>
    ctx.json(201, {
      message: `${ctx.body.greeting}, ${ctx.params.name}${ctx.body.punctuation}`,
      name: ctx.params.name,
    }),
});
