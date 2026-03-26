export function sqlModuleTemplate(): string {
  return `import sql from "@schemavaults/dbh/sql";

export { sql };
export default sql;
`;
}

export default sqlModuleTemplate;
