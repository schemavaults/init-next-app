export function exampleMigrationFileTemplate(): string {
  return `import type { Kysely } from "@schemavaults/dbh";

export async function up(db: Kysely<any>): Promise<void> {

}
export async function down(db: Kysely<any>): Promise<void> {

}
`;
}

export default exampleMigrationFileTemplate;
