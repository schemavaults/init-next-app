export type DeploymentStrategy = "vercel" | "none";

export function ciWorkflowTemplate(deployment: DeploymentStrategy): string {
  const publishVercelJob =
    deployment === "vercel"
      ? `
  publish-to-vercel:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
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

      - name: Install Vercel CLI
        run: bun add -g vercel@latest

      - name: Pull Vercel environment information
        run: vercel pull --yes --environment=production --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

      - name: Build project artifacts
        run: vercel build --prod --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}

      - name: Deploy project artifacts to Vercel
        run: vercel deploy --prebuilt --prod --token=\${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: \${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: \${{ secrets.VERCEL_PROJECT_ID }}
`
      : "";

  return `name: CI

on:
  push:
    branches:
      - main
      - "feature/*"
      - "claude/*"
      - "fix/*"
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    env:
      SCHEMAVAULTS_APP_ENVIRONMENT: production

    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2

      - uses: actions/setup-node@v5
        with:
          node-version: 24
          registry-url: "https://registry.npmjs.org"

      - name: Install dependencies
        run: bun install

      - name: Typecheck
        run: bun run typecheck

      - name: Build
        run: bun run build

  migrate:
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    uses: ./.github/workflows/migrate-production.yml
    secrets: inherit
${publishVercelJob}`;
}

export default ciWorkflowTemplate;
