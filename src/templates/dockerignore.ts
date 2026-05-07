export function dockerignoreTemplate(): string {
  return `node_modules
.next
.git
.env*
dist
*.md
postgres-data
cypress
cypress.config.ts
`;
}

export default dockerignoreTemplate;
