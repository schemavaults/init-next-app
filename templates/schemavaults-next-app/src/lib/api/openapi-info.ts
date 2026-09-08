/**
 * Top-level metadata of the generated OpenAPI document (`info`, `servers`).
 * Edit this file to change the title/description shown on `/docs`; the
 * version is read from package.json. Re-run `bun run openapi:generate` after
 * changing it.
 */
import packageJson from "../../../package.json";
import type { OpenApiDocumentInfo } from "./openapi-document";

export const openApiInfo: OpenApiDocumentInfo = {
  title: "xxx_display_name_xxx",
  description: "xxx_description_xxx",
  version: packageJson.version,
  servers: [
    {
      url: "/",
      description: "The origin this document was served from",
    },
  ],
};
