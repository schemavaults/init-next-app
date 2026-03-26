import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { packageJsonTemplate } from "./templates/package.json.js";
import { nextConfigTemplate } from "./templates/next-config.js";
import { tsconfigTemplate } from "./templates/tsconfig.json.js";
import { layoutTemplate } from "./templates/layout.tsx.js";
import { pageTemplate } from "./templates/page.tsx.js";
import { exampleAuthenticatedHomepageTemplate } from "./templates/example_authenticated_homepage.tsx.js";
import { tailwindConfigTemplate } from "./templates/tailwind.config.ts.js";
import { postcssConfigTemplate } from "./templates/postcss.config.cjs.js";
import { clientGlobalProvidersTemplate } from "./templates/client-global-providers.tsx.js";
import { exampleEnvTemplate } from "./templates/env.example.js";

// db templates
import { sqlModuleTemplate } from "./templates/db/sql-module.js";
import { exampleMigrationFileTemplate } from "./templates/db/example-migration-file.js";
import { databaseTableTypesTemplate } from "./templates/db/database-table-types.js";
import { serverlessDatabaseTemplate } from "./templates/db/serverless-database.js";

const GITIGNORE = `# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*.local
.env
.env.development
.env.test
.env.staging
.env.production

# typescript
*.tsbuildinfo
next-env.d.ts

# ignore auth-codegen'd files
src/app/auth/
`;

export function scaffold(
  projectName: string,
  targetDir: string,
  displayName: string,
  description: string,
): void {
  // Create directories
  mkdirSync(join(targetDir, "src", "app"), { recursive: true });
  mkdirSync(join(targetDir, "src", "app", "home"), { recursive: true });
  mkdirSync(join(targetDir, "src", "db", "migrations"), { recursive: true });
  mkdirSync(join(targetDir, "public"), { recursive: true });

  // Write files
  writeFileSync(
    join(targetDir, "package.json"),
    packageJsonTemplate(projectName, description) + "\n",
  );
  writeFileSync(join(targetDir, "next.config.ts"), nextConfigTemplate());
  writeFileSync(
    join(targetDir, "tailwind.config.ts"),
    tailwindConfigTemplate(),
  );
  writeFileSync(join(targetDir, ".env.example"), exampleEnvTemplate());
  writeFileSync(join(targetDir, "postcss.config.cjs"), postcssConfigTemplate());
  writeFileSync(join(targetDir, "tsconfig.json"), tsconfigTemplate() + "\n");
  writeFileSync(join(targetDir, ".gitignore"), GITIGNORE);
  writeFileSync(
    join(targetDir, "src", "app", "layout.tsx"),
    layoutTemplate(displayName, description),
  );
  writeFileSync(
    join(targetDir, "src", "app", "page.tsx"),
    pageTemplate(displayName),
  );
  writeFileSync(
    join(targetDir, "src", "app", "client-global-providers.tsx"),
    clientGlobalProvidersTemplate(),
  );
  writeFileSync(
    join(targetDir, "src", "app", "home", "page.tsx"),
    exampleAuthenticatedHomepageTemplate(displayName),
  );

  // db file scaffolding
  writeFileSync(join(targetDir, "src", "db", "sql.ts"), sqlModuleTemplate());
  writeFileSync(
    join(targetDir, "src", "db", "migrations", "00000-example-migration.ts"),
    exampleMigrationFileTemplate(),
  );
  writeFileSync(
    join(targetDir, "src", "db", "database-table-types.ts"),
    databaseTableTypesTemplate(),
  );
  writeFileSync(
    join(targetDir, "src", "db", "serverless-database.ts"),
    serverlessDatabaseTemplate(),
  );
}
