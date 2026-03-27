import versions from "../../config/versions.json";

export function packageJsonTemplate(
  projectName: string,
  description: string,
): string {
  return JSON.stringify(
    {
      name: projectName,
      version: "0.0.1",
      description,
      private: true,
      type: "module",
      scripts: {
        dev: "bun run auth-codegen && next dev",
        build: "bun run auth-codegen && next build",
        typecheck: "bun run auth-codegen && tsc --noEmit",
        "build:migrations":
          "bunx @schemavaults/dbh build-db-migrations ./src/db/migrations --outdir ./dist/migrations --sql-module ./src/db/sql.ts --sql-outdir ./dist/",
        "migrate:development":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment development --env-file .env.development",
        "migrate:test":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment test --env-file .env.test",
        "migrate:production":
          "bun run build:migrations && npx @schemavaults/dbh migrate ./dist/migrations --environment production --env-file .env.production",
        "auth-codegen": "bunx @schemavaults/auth-server-sdk codegen",
        start: "next start",
        lint: "NEXT_TELEMETRY_DISABLED=1 next typegen && eslint src --ext .ts,.tsx",
      },
      dependencies: {
        next: versions["next"],
        react: versions["react"],
        "react-dom": versions["react-dom"],
        "@schemavaults/theme": versions["@schemavaults/theme"],
        "@schemavaults/ui": versions["@schemavaults/ui"],
        "@schemavaults/dbh": versions["@schemavaults/dbh"],
        "@schemavaults/auth-react-provider":
          versions["@schemavaults/auth-react-provider"],
        "@schemavaults/auth-server-sdk":
          versions["@schemavaults/auth-server-sdk"],
        "server-only": versions["server-only"],
      },
      devDependencies: {
        typescript: versions["typescript"],
        tailwindcss: versions["tailwindcss"],
        postcss: versions["postcss"],
        autoprefixer: versions["autoprefixer"],
        "@types/node": versions["@types/node"],
        "@types/react": versions["@types/react"],
        "@types/react-dom": versions["@types/react-dom"],
        eslint: versions["eslint"],
        "@eslint/js": versions["@eslint/js"],
        globals: versions["globals"],
        "@typescript-eslint/eslint-plugin":
          versions["@typescript-eslint/eslint-plugin"],
        "@typescript-eslint/parser": versions["@typescript-eslint/parser"],
        "eslint-config-next": versions["next"],
      },
    },
    null,
    2,
  );
}
