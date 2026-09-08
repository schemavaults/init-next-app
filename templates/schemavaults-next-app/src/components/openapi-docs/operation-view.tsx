import type { ReactElement } from "react";
import type {
  MediaTypeObject,
  OpenApiDocument,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
} from "./types";
import {
  buildExample,
  dereference,
  formatJson,
  methodBadgeClasses,
  requiresAuth,
  schemaTypeLabel,
  statusBadgeClasses,
  type DocumentedOperation,
} from "./openapi-utils";
import { SchemaView } from "./schema-view";

const PARAMETER_LOCATIONS: Array<ParameterObject["in"]> = ["path", "query", "header", "cookie"];

export function OperationView({
  document,
  documented,
}: {
  document: OpenApiDocument;
  documented: DocumentedOperation;
}): ReactElement {
  const { method, path, operation, parameters, anchor } = documented;
  const requestBody = dereference<RequestBodyObject>(document, operation.requestBody);
  const responses = Object.entries(operation.responses ?? {});
  const protectedOperation = requiresAuth(document, operation);

  return (
    <article
      id={anchor}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
        <MethodBadge method={method} />
        <code className="break-all font-mono text-sm font-semibold">{path}</code>
        {operation.summary ? (
          <span className="text-sm text-muted-foreground">{operation.summary}</span>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          {operation.deprecated ? (
            <Pill className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300">
              Deprecated
            </Pill>
          ) : null}
          {protectedOperation ? (
            <Pill className="border-border bg-muted text-muted-foreground" title="Requires authentication">
              <LockIcon /> Auth required
            </Pill>
          ) : (
            <Pill className="border-border bg-muted text-muted-foreground">Public</Pill>
          )}
        </span>
      </header>

      <div className="space-y-6 px-4 py-4">
        {operation.operationId ? (
          <div className="text-xs text-muted-foreground">
            Operation ID: <code className="font-mono">{operation.operationId}</code>
          </div>
        ) : null}

        {operation.description ? (
          <p className="whitespace-pre-line text-sm leading-6">{operation.description}</p>
        ) : null}

        {parameters.length > 0 ? (
          <Section title="Parameters">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">In</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PARAMETER_LOCATIONS.flatMap((location) =>
                    parameters
                      .filter((parameter) => parameter.in === location)
                      .map((parameter) => (
                        <ParameterRow
                          key={`${parameter.in}-${parameter.name}`}
                          document={document}
                          parameter={parameter}
                        />
                      )),
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        ) : null}

        {requestBody ? (
          <Section
            title="Request body"
            aside={requestBody.required ? "required" : "optional"}
          >
            {requestBody.description ? (
              <p className="text-sm text-muted-foreground">{requestBody.description}</p>
            ) : null}
            <ContentView document={document} content={requestBody.content} />
          </Section>
        ) : null}

        {responses.length > 0 ? (
          <Section title="Responses">
            <div className="space-y-4">
              {responses.map(([status, responseOrRef]) => {
                const response = dereference<ResponseObject>(document, responseOrRef);
                return (
                  <div key={status} className="space-y-3 rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Pill className={statusBadgeClasses(status)}>{status}</Pill>
                      <span className="text-sm">{response?.description ?? ""}</span>
                    </div>
                    {response?.headers && Object.keys(response.headers).length > 0 ? (
                      <div className="text-xs text-muted-foreground">
                        Headers:{" "}
                        {Object.keys(response.headers).map((name) => (
                          <code key={name} className="mr-1 rounded bg-muted px-1 py-0.5 font-mono">
                            {name}
                          </code>
                        ))}
                      </div>
                    ) : null}
                    <ContentView document={document} content={response?.content} />
                  </div>
                );
              })}
            </div>
          </Section>
        ) : null}
      </div>
    </article>
  );
}

function ParameterRow({
  document,
  parameter,
}: {
  document: OpenApiDocument;
  parameter: ParameterObject;
}): ReactElement {
  const example = parameter.example ?? (parameter.schema ? buildExample(document, parameter.schema) : undefined);
  const resolvedSchema = dereference<NonNullable<ParameterObject["schema"]>>(document, parameter.schema);
  const enumValues =
    resolvedSchema && !("$ref" in resolvedSchema) && resolvedSchema.enum ? resolvedSchema.enum : undefined;
  const defaultValue =
    resolvedSchema && !("$ref" in resolvedSchema) ? resolvedSchema.default : undefined;
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        <code className="font-mono text-sm font-semibold">{parameter.name}</code>
        <div className="text-xs">
          {parameter.required ? (
            <span className="text-destructive">required</span>
          ) : (
            <span className="text-muted-foreground">optional</span>
          )}
          {parameter.deprecated ? (
            <span className="ml-2 text-amber-700 dark:text-amber-300">deprecated</span>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2 text-muted-foreground">{parameter.in}</td>
      <td className="px-3 py-2">
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {schemaTypeLabel(document, parameter.schema)}
        </code>
      </td>
      <td className="space-y-1 px-3 py-2">
        {parameter.description ? <p>{parameter.description}</p> : null}
        {enumValues ? (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            Allowed:
            {enumValues.map((value, index) => (
              <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono">
                {JSON.stringify(value)}
              </code>
            ))}
          </div>
        ) : null}
        {defaultValue !== undefined ? (
          <div className="text-xs text-muted-foreground">
            Default: <code className="font-mono">{JSON.stringify(defaultValue)}</code>
          </div>
        ) : null}
        {example !== undefined && example !== null && example !== defaultValue ? (
          <div className="text-xs text-muted-foreground">
            Example: <code className="font-mono">{JSON.stringify(example)}</code>
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function ContentView({
  document,
  content,
}: {
  document: OpenApiDocument;
  content: Record<string, MediaTypeObject> | undefined;
}): ReactElement | null {
  const entries = Object.entries(content ?? {});
  if (entries.length === 0) {
    return <p className="text-xs text-muted-foreground">No body.</p>;
  }
  return (
    <div className="space-y-4">
      {entries.map(([mediaType, media]) => {
        const example =
          media.example !== undefined
            ? media.example
            : firstNamedExample(media) ?? buildExample(document, media.schema);
        return (
          <div key={mediaType} className="space-y-3">
            <div className="text-xs text-muted-foreground">
              Content type: <code className="font-mono">{mediaType}</code>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Schema
                </div>
                <SchemaView document={document} schema={media.schema} />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Example
                </div>
                <pre className="overflow-x-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs leading-5">
                  {formatJson(example)}
                </pre>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function firstNamedExample(media: MediaTypeObject): unknown {
  const first = Object.values(media.examples ?? {})[0];
  if (!first || "$ref" in first) return undefined;
  return first.value;
}

export function MethodBadge({ method }: { method: DocumentedOperation["method"] }): ReactElement {
  return (
    <span
      className={`inline-flex min-w-[4.5rem] justify-center rounded border px-2 py-0.5 font-mono text-xs font-bold uppercase ${methodBadgeClasses(method)}`}
    >
      {method}
    </span>
  );
}

function Pill({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className: string;
  title?: string;
}): ReactElement {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className="space-y-3">
      <h4 className="flex items-baseline gap-2 text-sm font-semibold">
        {title}
        {aside ? <span className="text-xs font-normal text-muted-foreground">{aside}</span> : null}
      </h4>
      {children}
    </section>
  );
}

function LockIcon(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="12"
      height="12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
