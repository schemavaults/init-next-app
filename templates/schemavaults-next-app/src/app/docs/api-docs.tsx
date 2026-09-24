import { headers } from "next/headers";
import { createApiDocsPages } from "@schemavaults/openapi-docs-ui/nextjs";
import { getOpenApiDocument } from "@/lib/api/openapi-document";

/**
 * `/docs` (index) and `/docs/[slug]` (one page per operation), rendered by
 * `@schemavaults/openapi-docs-ui` from the live OpenAPI document. The
 * committed `public/openapi.json` is the same document; `bun run
 * openapi:check` keeps the two in sync.
 */
export const apiDocs = createApiDocsPages({
  loadDocument: getOpenApiDocument,
  basePath: "/docs",
  openApiDocumentHref: "/openapi.json",
  // Show the real deployment origin in the header and curl examples.
  resolveServerUrl: async () => {
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    if (!host) return undefined;
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
    return `${protocol}://${host}`;
  },
  wrap: (page) => <main className="container mx-auto max-w-6xl px-4 py-8">{page}</main>,
});
