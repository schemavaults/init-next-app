import type { Metadata } from "next";
import type { ReactElement } from "react";
import openapi from "../../../public/openapi.json";
import { OpenApiDocumentView } from "@/components/openapi-docs/document-view";
import type { OpenApiDocument } from "@/components/openapi-docs/types";

/**
 * `/docs` renders the committed `public/openapi.json` (also served raw at
 * `/openapi.json`). Regenerate it with `bun run openapi:generate` after
 * changing any `src/app/api/** /operations.ts`.
 */
const document = openapi as unknown as OpenApiDocument;

export const metadata: Metadata = {
  title: `API Reference · ${document.info.title}`,
  description: document.info.description,
};

export default function ApiDocsPage(): ReactElement {
  return <OpenApiDocumentView document={document} specUrl="/openapi.json" />;
}
