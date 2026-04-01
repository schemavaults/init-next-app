export function dockerignoreTemplate(): string {
  return `node_modules
.next
.git
.env*
dist
*.md
`;
}

export default dockerignoreTemplate;
