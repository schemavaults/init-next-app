import type { ReactElement } from "react";
import type { OpenApiDocument, SchemaObject, SchemaOrRef } from "./types";
import {
  compositeKind,
  dereference,
  isArraySchema,
  isObjectSchema,
  isReference,
  referenceName,
  schemaConstraints,
  schemaTypeLabel,
} from "./openapi-utils";

const MAX_DEPTH = 6;

export interface SchemaViewProps {
  document: OpenApiDocument;
  schema: SchemaOrRef | undefined;
  /** `$ref`s already being rendered up the tree; stops infinite recursion. */
  stack?: string[];
  depth?: number;
}

/**
 * Recursive, dependency-free renderer for a JSON Schema / OpenAPI schema.
 * Objects render as property lists, arrays as their item schema, `$ref`s as
 * links to the schema section plus an inline expansion, and everything else
 * as a type label with its constraints.
 */
export function SchemaView({
  document,
  schema,
  stack = [],
  depth = 0,
}: SchemaViewProps): ReactElement {
  if (!schema) {
    return <TypeLabel>any</TypeLabel>;
  }

  if (isReference(schema)) {
    const name = referenceName(schema.$ref);
    const cyclic = stack.includes(schema.$ref);
    const resolved = cyclic ? undefined : dereference<SchemaObject>(document, schema);
    return (
      <div className="space-y-2">
        <a
          href={`#schema-${encodeURIComponent(name)}`}
          className="font-mono text-sm text-primary underline-offset-4 hover:underline"
        >
          {name}
        </a>
        {cyclic ? (
          <span className="ml-2 text-xs text-muted-foreground">(recursive)</span>
        ) : resolved && depth < MAX_DEPTH ? (
          <SchemaView
            document={document}
            schema={resolved}
            stack={[...stack, schema.$ref]}
            depth={depth + 1}
          />
        ) : null}
      </div>
    );
  }

  const composite = compositeKind(schema);
  if (composite) {
    const label =
      composite === "oneOf" ? "One of" : composite === "anyOf" ? "Any of" : "All of";
    return (
      <div className="space-y-2">
        <Description schema={schema} />
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <ol className="space-y-2 border-l border-border pl-3">
          {(schema[composite] ?? []).map((variant, index) => (
            <li key={index} className="space-y-1">
              <div className="text-xs text-muted-foreground">Option {index + 1}</div>
              <SchemaView document={document} schema={variant} stack={stack} depth={depth + 1} />
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (isObjectSchema(schema)) {
    return <ObjectSchemaView document={document} schema={schema} stack={stack} depth={depth} />;
  }

  if (isArraySchema(schema)) {
    return (
      <div className="space-y-2">
        <Description schema={schema} />
        <div className="flex flex-wrap items-baseline gap-2">
          <TypeLabel>{schemaTypeLabel(document, schema)}</TypeLabel>
          <Constraints schema={schema} />
        </div>
        {schema.items && depth < MAX_DEPTH ? (
          <div className="border-l border-border pl-3">
            <div className="mb-1 text-xs text-muted-foreground">Items</div>
            <SchemaView document={document} schema={schema.items} stack={stack} depth={depth + 1} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <TypeLabel>{schemaTypeLabel(document, schema)}</TypeLabel>
        <Constraints schema={schema} />
      </div>
      <Description schema={schema} />
      <EnumValues schema={schema} />
      <DefaultAndExample schema={schema} />
    </div>
  );
}

function ObjectSchemaView({
  document,
  schema,
  stack,
  depth,
}: {
  document: OpenApiDocument;
  schema: SchemaObject;
  stack: string[];
  depth: number;
}): ReactElement {
  const properties = Object.entries(schema.properties ?? {});
  const required = new Set(schema.required ?? []);
  const additional = schema.additionalProperties;

  return (
    <div className="space-y-2">
      <Description schema={schema} />
      {properties.length === 0 && !additional ? (
        <TypeLabel>object</TypeLabel>
      ) : null}
      {properties.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {properties.map(([name, property]) => {
            const resolved = isReference(property)
              ? dereference<SchemaObject>(document, property)
              : property;
            const nested =
              depth < MAX_DEPTH &&
              (isReference(property) ||
                (resolved !== undefined &&
                  (isObjectSchema(resolved) ||
                    isArraySchema(resolved) ||
                    compositeKind(resolved) !== null)));
            return (
              <li key={name} className="space-y-1 bg-card p-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <code className="font-mono text-sm font-semibold">{name}</code>
                  {required.has(name) ? (
                    <span className="text-xs font-medium text-destructive">required</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">optional</span>
                  )}
                  <TypeLabel>{schemaTypeLabel(document, property)}</TypeLabel>
                  {resolved ? <Constraints schema={resolved} /> : null}
                  {resolved?.deprecated ? (
                    <span className="text-xs text-amber-700 dark:text-amber-300">deprecated</span>
                  ) : null}
                </div>
                {resolved?.description ? (
                  <p className="text-sm text-muted-foreground">{resolved.description}</p>
                ) : null}
                {resolved ? <EnumValues schema={resolved} /> : null}
                {resolved ? <DefaultAndExample schema={resolved} /> : null}
                {nested ? (
                  <details className="mt-1" open={depth < 1}>
                    <summary className="cursor-pointer select-none text-xs text-muted-foreground">
                      Show schema
                    </summary>
                    <div className="mt-2 pl-2">
                      <SchemaView
                        document={document}
                        schema={property}
                        stack={stack}
                        depth={depth + 1}
                      />
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {additional ? (
        <div className="text-xs text-muted-foreground">
          Additional properties:{" "}
          {additional === true ? (
            "allowed (any type)"
          ) : (
            <TypeLabel>{schemaTypeLabel(document, additional)}</TypeLabel>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TypeLabel({ children }: { children: string }): ReactElement {
  return (
    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function Description({ schema }: { schema: SchemaObject }): ReactElement | null {
  if (!schema.description) return null;
  return <p className="text-sm text-muted-foreground">{schema.description}</p>;
}

function Constraints({ schema }: { schema: SchemaObject }): ReactElement | null {
  const constraints = schemaConstraints(schema);
  if (constraints.length === 0) return null;
  return (
    <span className="text-xs text-muted-foreground">{constraints.join(" · ")}</span>
  );
}

function EnumValues({ schema }: { schema: SchemaObject }): ReactElement | null {
  if (!schema.enum || schema.enum.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      <span className="text-muted-foreground">Allowed:</span>
      {schema.enum.map((value, index) => (
        <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono">
          {JSON.stringify(value)}
        </code>
      ))}
    </div>
  );
}

function DefaultAndExample({ schema }: { schema: SchemaObject }): ReactElement | null {
  const parts: Array<[string, unknown]> = [];
  if (schema.default !== undefined) parts.push(["Default", schema.default]);
  if (schema.example !== undefined) parts.push(["Example", schema.example]);
  else if (schema.examples && schema.examples.length > 0) parts.push(["Example", schema.examples[0]]);
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {parts.map(([label, value]) => (
        <span key={label} className="text-muted-foreground">
          {label}:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono">{JSON.stringify(value)}</code>
        </span>
      ))}
    </div>
  );
}
