export function migrateProductionWorkflowTemplate(): string {
  return `name: Run Production Migrations

on:
  workflow_call:

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2

      - uses: actions/setup-node@v5
        with:
          node-version: 24
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: bun install

      - name: Write .env.production
        run: |
          cat <<EOF > .env.production
          POSTGRES_URL=\${{ secrets.POSTGRES_URL }}
          POSTGRES_PRISMA_URL=\${{ secrets.POSTGRES_PRISMA_URL }}
          POSTGRES_URL_NON_POOLING=\${{ secrets.POSTGRES_URL_NON_POOLING }}
          POSTGRES_USER=\${{ secrets.POSTGRES_USER }}
          POSTGRES_HOST=\${{ secrets.POSTGRES_HOST }}
          POSTGRES_PASSWORD=\${{ secrets.POSTGRES_PASSWORD }}
          POSTGRES_DATABASE=\${{ secrets.POSTGRES_DATABASE }}
          EOF

      - name: Run migrations
        run: bun run migrate:production
`;
}

export default migrateProductionWorkflowTemplate;
