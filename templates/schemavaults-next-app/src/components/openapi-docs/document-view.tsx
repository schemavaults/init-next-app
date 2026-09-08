import type { ReactElement } from "react";
import type { OpenApiDocument, SecuritySchemeObject } from "./types";
import { dereference, groupOperationsByTag } from "./openapi-utils";
import { MethodBadge, OperationView } from "./operation-view";
import { SchemaView } from "./schema-view";

export interface OpenApiDocumentViewProps {
  document: OpenApiDocument;
  /** Where the raw JSON is served, linked from the header. */
  specUrl?: string;
}

/**
 * Renders a complete OpenAPI document as static HTML: sidebar navigation,
 * header, operations grouped by tag, security schemes and component schemas.
 * Server component; no client-side JavaScript or external dependencies.
 */
export function OpenApiDocumentView({ document, specUrl }: OpenApiDocumentViewProps): ReactElement {
  const groups = groupOperationsByTag(document);
  const schemas = Object.entries(document.components?.schemas ?? {});
  const securitySchemes = Object.entries(document.components?.securitySchemes ?? {})
    .map(([name, scheme]) => [name, dereference<SecuritySchemeObject>(document, scheme)] as const)
    .filter((entry): entry is readonly [string, SecuritySchemeObject] => entry[1] !== undefined);
  const operationCount = groups.reduce((sum, group) => sum + group.operations.length, 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <nav
        aria-label="API navigation"
        className="mb-8 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-lg border border-border bg-card p-4 text-sm lg:sticky lg:top-8 lg:mb-0"
      >
        <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Endpoints ({operationCount})
        </div>
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.name}>
              <a href={`#tag-${encodeURIComponent(group.name)}`} className="font-semibold hover:underline">
                {group.name}
              </a>
              <ul className="mt-1 space-y-1 border-l border-border pl-2">
                {group.operations.map((documented) => (
                  <li key={documented.anchor}>
                    <a
                      href={`#${documented.anchor}`}
                      className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-muted"
                    >
                      <span className="mt-0.5 w-12 shrink-0 font-mono text-[10px] font-bold uppercase text-muted-foreground">
                        {documented.method}
                      </span>
                      <span className="break-all font-mono text-xs">{documented.path}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {schemas.length > 0 ? (
            <li>
              <a href="#schemas" className="font-semibold hover:underline">
                Schemas
              </a>
              <ul className="mt-1 space-y-1 border-l border-border pl-2">
                {schemas.map(([name]) => (
                  <li key={name}>
                    <a
                      href={`#schema-${encodeURIComponent(name)}`}
                      className="block break-all rounded px-1 py-0.5 font-mono text-xs hover:bg-muted"
                    >
                      {name}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
        </ul>
      </nav>

      <main className="min-w-0 space-y-12">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{document.info.title}</h1>
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              v{document.info.version}
            </span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              OpenAPI {document.openapi}
            </span>
          </div>
          {document.info.description ? (
            <p className="max-w-3xl whitespace-pre-line text-base leading-7 text-muted-foreground">
              {document.info.description}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {specUrl ? (
              <a href={specUrl} className="text-primary underline-offset-4 hover:underline">
                Download openapi.json
              </a>
            ) : null}
            {document.info.contact?.email ? (
              <a
                href={`mailto:${document.info.contact.email}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Contact
              </a>
            ) : null}
            {document.info.license ? (
              document.info.license.url ? (
                <a href={document.info.license.url} className="text-primary underline-offset-4 hover:underline">
                  License: {document.info.license.name}
                </a>
              ) : (
                <span className="text-muted-foreground">License: {document.info.license.name}</span>
              )
            ) : null}
          </div>
          {document.servers && document.servers.length > 0 ? (
            <div className="space-y-1 text-sm">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Servers
              </div>
              <ul className="space-y-1">
                {document.servers.map((server) => (
                  <li key={server.url} className="flex flex-wrap items-baseline gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{server.url}</code>
                    {server.description ? (
                      <span className="text-muted-foreground">{server.description}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </header>

        {securitySchemes.length > 0 ? (
          <section id="authentication" className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold">Authentication</h2>
            <ul className="space-y-2">
              {securitySchemes.map(([name, scheme]) => (
                <li key={name} className="rounded-lg border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <code className="font-mono font-semibold">{name}</code>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {[scheme.type, scheme.scheme, scheme.bearerFormat, scheme.in && `in ${scheme.in}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  {scheme.description ? (
                    <p className="mt-1 text-muted-foreground">{scheme.description}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">This API has no operations yet.</p>
        ) : null}

        {groups.map((group) => (
          <section
            key={group.name}
            id={`tag-${group.name}`}
            className="scroll-mt-24 space-y-4"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">{group.name}</h2>
              {group.description ? (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              ) : null}
            </div>
            <div className="space-y-4">
              {group.operations.map((documented) => (
                <OperationView key={documented.anchor} document={document} documented={documented} />
              ))}
            </div>
          </section>
        ))}

        {schemas.length > 0 ? (
          <section id="schemas" className="scroll-mt-24 space-y-4">
            <h2 className="text-xl font-semibold">Schemas</h2>
            <div className="space-y-4">
              {schemas.map(([name, schema]) => (
                <article
                  key={name}
                  id={`schema-${name}`}
                  className="scroll-mt-24 space-y-3 rounded-lg border border-border bg-card p-4"
                >
                  <h3 className="font-mono text-base font-semibold">{name}</h3>
                  <SchemaView document={document} schema={schema} />
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
          Generated from{" "}
          <code className="font-mono">public/openapi.json</code>. Add or change operations in{" "}
          <code className="font-mono">src/app/api/**/operations.ts</code>, then run{" "}
          <code className="font-mono">bun run openapi:generate</code>.
          <span className="ml-1">
            <MethodBadge method="get" /> <code className="font-mono">/docs</code> is this page.
          </span>
        </footer>
      </main>
    </div>
  );
}
