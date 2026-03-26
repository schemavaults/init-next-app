export function databaseTableTypesTemplate(): string {
  return `// database-table-types.ts
// Exports the shape of the database as Record<*table name*, *table shape*>

export type DatabaseTables = {};
`;
}

export default databaseTableTypesTemplate;
