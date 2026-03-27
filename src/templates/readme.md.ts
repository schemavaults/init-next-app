export function readmeTemplate(displayName: string): string {
  return `# ${displayName}

## Getting Started

Install dependencies:

\`\`\`bash
bun install
\`\`\`

## Scripts

### Development

\`\`\`bash
bun run dev
\`\`\`

Start the development server (runs auth codegen first).

### Build

\`\`\`bash
bun run build
\`\`\`

Build the application for production.

### Start

\`\`\`bash
bun run start
\`\`\`

Start the production server.

### Lint

\`\`\`bash
bun run lint
\`\`\`

Run linting.

### Type Check

\`\`\`bash
bun run typecheck
\`\`\`

Run TypeScript type checking.

### Auth Codegen

\`\`\`bash
bun run auth-codegen
\`\`\`

Generate auth SDK code.

### Database Migrations

Build database migrations:

\`\`\`bash
bun run build:migrations
\`\`\`

Run migrations for a specific environment:

\`\`\`bash
bun run migrate:development
bun run migrate:test
bun run migrate:production
\`\`\`
`;
}
