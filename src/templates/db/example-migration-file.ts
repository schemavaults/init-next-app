export function exampleMigrationFileTemplate(): string {
  return `import type { Kysely } from "@schemavaults/dbh";

export async function up(db: Kysely<any>): Promise<void> {
  void db;
}
export async function down(db: Kysely<any>): Promise<void> {
  void db;
}
`;
}

export default exampleMigrationFileTemplate;
