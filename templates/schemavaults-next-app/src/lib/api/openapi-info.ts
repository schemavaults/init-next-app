/**
 * Top-level metadata of the OpenAPI document (`info`, `servers`, `tags`).
 * Edit this file to change what `/docs` shows above the operations; the
 * version is read from package.json.
 */
import type { BuildOpenApiDocumentOptions } from "@schemavaults/openapi-operations";
import packageJson from "../../../package.json";

export const openApiInfo: Pick<BuildOpenApiDocumentOptions, "info" | "servers" | "tags"> = {
  info: {
    title: "xxx_display_name_xxx",
    description: "xxx_description_xxx",
    version: packageJson.version,
  },
  servers: [{ url: "/", description: "The origin this document was served from" }],
  tags: [
    { name: "System", description: "Health and diagnostics." },
    { name: "Account", description: "The authenticated user." },
    { name: "Examples", description: "Sample operations scaffolded with the project; delete once you have real routes." },
  ],
};
