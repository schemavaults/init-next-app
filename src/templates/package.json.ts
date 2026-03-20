import versions from "../../config/versions.json";

export function packageJsonTemplate(projectName: string): string {
  return JSON.stringify(
    {
      name: projectName,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "bun run auth-codegen && next dev",
        build: "bun run auth-codegen && next build",
        "build:migrations":
          "bunx @schemavaults/dbh build-db-migrations ./src/db/migrations --outdir ./dist/migrations --sql-module ./src/db/sql.ts --sql-outdir ./dist/",
        "migrate:development":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment development",
        "migrate:test":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment test",
        "migrate:production":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment production",
        "auth-codegen": "bunx @schemavaults/auth-server-sdk codegen",
        start: "next start",
        lint: "next lint",
      },
      dependencies: {
        next: versions["next"],
        react: versions["react"],
        "react-dom": versions["react-dom"],
        d,
      },
      devDependencies: {
        typescript: versions["typescript"],
        tailwindcss: versions["tailwindcss"],
        "@types/node": versions["@types/node"],
        "@types/react": versions["@types/react"],
        "@types/react-dom": versions["@types/react-dom"],
      },
    },
    null,
    2,
  );
}
