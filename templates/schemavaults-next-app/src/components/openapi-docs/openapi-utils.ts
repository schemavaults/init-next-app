/**
 * Pure helpers for rendering an OpenAPI document: `$ref` resolution, type
 * labels, example generation, grouping and colours.
 */
import {
  HTTP_METHODS,
  type HttpMethod,
  type OpenApiDocument,
  type OperationObject,
  type ParameterObject,
  type PathItemObject,
  type ReferenceObject,
  type SchemaObject,
  type SchemaOrRef,
} from "./types";

export function isReference(value: unknown): value is ReferenceObject {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ReferenceObject).$ref === "string"
  );
}

export function referenceName(ref: string): string {
  const last = ref.split("/").pop() ?? ref;
  return decodeJsonPointerSegment(last);
}

function decodeJsonPointerSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // keep the raw segment
  }
  return decoded.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Resolve a local JSON pointer such as `#/components/schemas/Item`. */
export function resolveReference<T>(document: OpenApiDocument, ref: string): T | undefined {
  if (!ref.startsWith("#/")) return undefined;
  let current: unknown = document;
  for (const segment of ref.slice(2).split("/")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[decodeJsonPointerSegment(segment)];
  }
  return current as T | undefined;
}

/** Follow `$ref`s (with a cycle guard) until a concrete object is reached. */
export function dereference<T>(
  document: OpenApiDocument,
  value: T | ReferenceObject | undefined,
): T | undefined {
  const seen = new Set<string>();
  let current: T | ReferenceObject | undefined = value;
  while (isReference(current)) {
    if (seen.has(current.$ref)) return undefined;
    seen.add(current.$ref);
    current = resolveReference<T | ReferenceObject>(document, current.$ref);
  }
  return current;
}

export function schemaTypes(schema: SchemaObject): string[] {
  const declared = Array.isArray(schema.type)
    ? schema.type
    : schema.type
      ? [schema.type]
      : [];
  if (schema.nullable && !declared.includes("null")) declared.push("null");
  if (declared.length === 0) {
    if (schema.properties || schema.additionalProperties !== undefined) return ["object"];
    if (schema.items || schema.prefixItems) return ["array"];
  }
  return declared;
}

export function isNullable(schema: SchemaObject): boolean {
  return schemaTypes(schema).includes("null") || schema.nullable === true;
}

export function isObjectSchema(schema: SchemaObject): boolean {
  return schemaTypes(schema).includes("object") || schema.properties !== undefined;
}

export function isArraySchema(schema: SchemaObject): boolean {
  return schemaTypes(schema).includes("array") || schema.items !== undefined;
}

export function compositeKind(schema: SchemaObject): "oneOf" | "anyOf" | "allOf" | null {
  if (schema.oneOf?.length) return "oneOf";
  if (schema.anyOf?.length) return "anyOf";
  if (schema.allOf?.length) return "allOf";
  return null;
}

/** Short human label for a schema, e.g. `string`, `Item[]`, `integer | null`. */
export function schemaTypeLabel(document: OpenApiDocument, schema: SchemaOrRef | undefined): string {
  if (!schema) return "any";
  if (isReference(schema)) return referenceName(schema.$ref);
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum && schema.enum.length > 0) {
    const base = schemaTypes(schema).filter((t) => t !== "null");
    return `${base[0] ?? "enum"}${isNullable(schema) ? " | null" : ""}`;
  }
  const composite = compositeKind(schema);
  if (composite) {
    const variants = (schema[composite] ?? []).map((v) => schemaTypeLabel(document, v));
    const joiner = composite === "allOf" ? " & " : " | ";
    return variants.join(joiner) + (isNullable(schema) ? " | null" : "");
  }
  const types = schemaTypes(schema);
  if (types.length === 0) return "any";
  return types
    .map((type) => {
      if (type === "array") {
        const inner = schemaTypeLabel(document, schema.items);
        return /[ |&]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
      }
      if (type === "object" && schema.title) return schema.title;
      if (type === "string" && schema.format) return `string<${schema.format}>`;
      return type;
    })
    .join(" | ");
}

export function schemaConstraints(schema: SchemaObject): string[] {
  const out: string[] = [];
  const push = (label: string, value: unknown): void => {
    if (value !== undefined && value !== null && value !== false) out.push(`${label}: ${String(value)}`);
  };
  push("min", schema.minimum);
  push("max", schema.maximum);
  push("exclusive min", typeof schema.exclusiveMinimum === "number" ? schema.exclusiveMinimum : undefined);
  push("exclusive max", typeof schema.exclusiveMaximum === "number" ? schema.exclusiveMaximum : undefined);
  push("multiple of", schema.multipleOf);
  push("min length", schema.minLength);
  push("max length", schema.maxLength);
  push("pattern", schema.pattern);
  push("min items", schema.minItems);
  push("max items", schema.maxItems);
  if (schema.uniqueItems) out.push("unique items");
  push("min properties", schema.minProperties);
  push("max properties", schema.maxProperties);
  if (schema.readOnly) out.push("read-only");
  if (schema.writeOnly) out.push("write-only");
  return out;
}

const MAX_EXAMPLE_DEPTH = 8;

/** Build a representative JSON value for a schema, preferring declared examples. */
export function buildExample(
  document: OpenApiDocument,
  schema: SchemaOrRef | undefined,
  stack: string[] = [],
): unknown {
  if (!schema || stack.length > MAX_EXAMPLE_DEPTH) return null;
  if (isReference(schema)) {
    if (stack.includes(schema.$ref)) return null;
    const resolved = resolveReference<SchemaOrRef>(document, schema.$ref);
    return buildExample(document, resolved, [...stack, schema.$ref]);
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.examples && schema.examples.length > 0) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];

  if (schema.allOf?.length) {
    const merged: Record<string, unknown> = {};
    for (const part of schema.allOf) {
      const value = buildExample(document, part, stack);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        Object.assign(merged, value);
      } else if (value !== null) {
        return value;
      }
    }
    return merged;
  }
  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) return buildExample(document, variants[0], stack);

  const types = schemaTypes(schema).filter((t) => t !== "null");
  const type = types[0];
  switch (type) {
    case "object": {
      const out: Record<string, unknown> = {};
      for (const [name, property] of Object.entries(schema.properties ?? {})) {
        out[name] = buildExample(document, property, stack);
      }
      if (
        Object.keys(out).length === 0 &&
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      ) {
        out["key"] = buildExample(document, schema.additionalProperties, stack);
      }
      return out;
    }
    case "array": {
      if (schema.prefixItems?.length) {
        return schema.prefixItems.map((item) => buildExample(document, item, stack));
      }
      const item = buildExample(document, schema.items, stack);
      return item === null && !schema.items ? [] : [item];
    }
    case "string":
      return exampleString(schema);
    case "integer":
      return typeof schema.minimum === "number" ? schema.minimum : 0;
    case "number":
      return typeof schema.minimum === "number" ? schema.minimum : 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return isNullable(schema) ? null : {};
  }
}

function exampleString(schema: SchemaObject): string {
  switch (schema.format) {
    case "date-time":
      return "2025-01-01T00:00:00.000Z";
    case "date":
      return "2025-01-01";
    case "time":
      return "00:00:00Z";
    case "duration":
      return "PT1H";
    case "uuid":
      return "123e4567-e89b-12d3-a456-426614174000";
    case "email":
      return "user@example.com";
    case "uri":
    case "url":
      return "https://example.com";
    case "hostname":
      return "example.com";
    case "ipv4":
      return "192.0.2.1";
    case "ipv6":
      return "2001:db8::1";
    case "byte":
    case "base64":
      return "aGVsbG8=";
    default: {
      const value = "string";
      if (typeof schema.maxLength === "number" && schema.maxLength < value.length) {
        return value.slice(0, schema.maxLength);
      }
      return value;
    }
  }
}

export interface DocumentedOperation {
  method: HttpMethod;
  path: string;
  operation: OperationObject;
  /** Path-level parameters merged with operation parameters. */
  parameters: ParameterObject[];
  anchor: string;
}

export function listOperations(document: OpenApiDocument): DocumentedOperation[] {
  const out: DocumentedOperation[] = [];
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    const pathItem: PathItemObject = item;
    const pathParameters = (pathItem.parameters ?? [])
      .map((p) => dereference<ParameterObject>(document, p))
      .filter((p): p is ParameterObject => p !== undefined);
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const own = (operation.parameters ?? [])
        .map((p) => dereference<ParameterObject>(document, p))
        .filter((p): p is ParameterObject => p !== undefined);
      const merged = [
        ...pathParameters.filter((pp) => !own.some((op) => op.name === pp.name && op.in === pp.in)),
        ...own,
      ];
      out.push({
        method,
        path,
        operation,
        parameters: merged,
        anchor: operationAnchor(method, path, operation),
      });
    }
  }
  return out;
}

export function operationAnchor(method: string, path: string, operation: OperationObject): string {
  const base = operation.operationId ?? `${method}-${path}`;
  return `op-${base.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export interface TagGroup {
  name: string;
  description?: string;
  operations: DocumentedOperation[];
}

export const UNTAGGED_GROUP = "Other";

/** Group operations by their first tag, in the order `document.tags` declares. */
export function groupOperationsByTag(document: OpenApiDocument): TagGroup[] {
  const groups = new Map<string, TagGroup>();
  for (const tag of document.tags ?? []) {
    groups.set(tag.name, { name: tag.name, description: tag.description, operations: [] });
  }
  for (const documented of listOperations(document)) {
    const name = documented.operation.tags?.[0] ?? UNTAGGED_GROUP;
    let group = groups.get(name);
    if (!group) {
      group = { name, operations: [] };
      groups.set(name, group);
    }
    group.operations.push(documented);
  }
  return [...groups.values()].filter((g) => g.operations.length > 0);
}

export function requiresAuth(document: OpenApiDocument, operation: OperationObject): boolean {
  const requirements = operation.security ?? document.security ?? [];
  return requirements.some((requirement) => Object.keys(requirement).length > 0);
}

export function methodBadgeClasses(method: HttpMethod): string {
  switch (method) {
    case "get":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "post":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "put":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "patch":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30";
    case "delete":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusBadgeClasses(status: string): string {
  const first = status.charAt(0);
  if (first === "2") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (first === "3") return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
  if (first === "4") return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
  if (first === "5") return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
  return "bg-muted text-muted-foreground border-border";
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? "null";
}
