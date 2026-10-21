import { createOAuthProtectedResourceMetadataRoute } from "@schemavaults/auth-server-sdk/oauth-protected-resource";
import { openApiInfo } from "@/lib/api/openapi-info";

// GET /.well-known/oauth-protected-resource — OAuth 2.0 Protected Resource
// Metadata (RFC 9728): tells OAuth clients (MCP clients, for one) which auth
// server issues tokens for this app and which `resource` URL to request them
// for (SCHEMAVAULTS_RESOURCE_URL; answers 404 while it is unset). The
// optional catch-all also answers the path-suffixed URLs of RFC 9728 §3.1.
// Protocol metadata, not part of the API, so it is not an operation in
// src/lib/api/operations.ts.
export const { GET, OPTIONS } = createOAuthProtectedResourceMetadataRoute({
  resource_name: openApiInfo.info.title,
  resource_documentation: "/docs",
});

export const dynamic = "force-dynamic";
