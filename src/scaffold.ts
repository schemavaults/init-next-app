import { chmodSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import versions from "../config/versions.json";
import type { SchemaVaultsPackageDependency } from "./npm-versions.js";
import { packageJsonTemplate } from "./templates/package.json.js";
import { nextConfigTemplate } from "./templates/next-config.js";
import { tsconfigTemplate } from "./templates/tsconfig.json.js";
import { rootLayoutTemplate } from "./templates/app/root-layout.tsx";
import { pageTemplate } from "./templates/app/page.tsx.js";
import { notFoundTemplate } from "./templates/app/not-found.tsx.js";
import { globalErrorTemplate } from "./templates/app/global-error.tsx.js";
import { clientViewTemplate } from "./templates/app/view.tsx";

import { clientGlobalProvidersTemplate } from "./templates/app/client-global-providers.tsx.js";
import { clientSideAuthLayoutTemplate } from "./templates/app/client-side-auth-layout.tsx.js";
import { exampleAuthenticatedHomepageTemplate } from "./templates/example_authenticated_homepage.tsx.js";
import { tailwindConfigTemplate } from "./templates/tailwind.config.ts.js";
import { postcssConfigTemplate } from "./templates/postcss.config.cjs.js";
import { exampleEnvTemplate } from "./templates/env.example.js";
import { envLocalTemplate } from "./templates/env.local.js";
import { readmeTemplate } from "./templates/readme.md.js";
import { eslintConfigTemplate } from "./templates/eslint.config.cjs.js";

// route guard templates
import withAuthenticatedApiRouteGuardTemplate from "./templates/route_guards/withAuthenticatedApiRouteGuard.js";
import withAuthenticatedServerComponentRouteGuardTemplate from "./templates/route_guards/withAuthenticatedServerComponentRouteGuard.js";

// docker templates
import { dockerfileTemplate } from "./templates/dockerfile.js";
import { dockerComposeTemplate } from "./templates/docker-compose.yml.js";
import { dockerignoreTemplate } from "./templates/dockerignore.js";

// cypress templates
import { cypressConfigTemplate } from "./templates/cypress/cypress.config.ts.js";
import { cypressTsconfigTemplate } from "./templates/cypress/tsconfig.json.js";
import { homepageCypressTestTemplate } from "./templates/cypress/homepage.cy.ts.js";

// claude templates
import { claudeSettingsTemplate } from "./templates/claude/settings.json.js";
import { installDepsInFreshEnvironmentHookTemplate } from "./templates/claude/install-deps-in-fresh-environment.sh.js";

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
/dist

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
src/app/(client)/auth/

# persisted docker compose postgres data
postgres-data/

# claude code local settings
.claude/settings.local.json
`;

async function scaffoldNextjsAppDirectory(
  projectName: string,
  srcDir: string,
  displayName: string,
  description: string,
): Promise<void> {
  if (!existsSync(srcDir)) {
    console.error(
      "Expected src/ directory to exist before this method is called!",
    );
    process.exit(1);
  }
  const appDir = join(srcDir, "app");
  const clientGroupDir = join(appDir, "(client)");

  mkdirSync(appDir);
  mkdirSync(clientGroupDir, { recursive: true });
  mkdirSync(join(clientGroupDir, "(index)"), { recursive: true });
  mkdirSync(join(clientGroupDir, "home"), { recursive: true });

  writeFileSync(
    join(appDir, "layout.tsx"),
    rootLayoutTemplate(displayName, description),
  );
  writeFileSync(join(appDir, "not-found.tsx"), notFoundTemplate());
  writeFileSync(join(appDir, "global-error.tsx"), globalErrorTemplate());
  writeFileSync(
    join(appDir, "client-global-providers.tsx"),
    clientGlobalProvidersTemplate(),
  );
  writeFileSync(
    join(clientGroupDir, "layout.tsx"),
    clientSideAuthLayoutTemplate(),
  );
  writeFileSync(
    join(clientGroupDir, "(index)", "view.tsx"),
    clientViewTemplate(displayName),
  );
  writeFileSync(join(clientGroupDir, "(index)", "page.tsx"), pageTemplate());
  writeFileSync(
    join(clientGroupDir, "home", "page.tsx"),
    exampleAuthenticatedHomepageTemplate(displayName),
  );
  return;
} // scaffoldNextjsAppDirectory

async function scaffoldClaudeFolder(targetDir: string): Promise<void> {
  const claudeDir = join(targetDir, ".claude");
  const hooksDir = join(claudeDir, "hooks");
  mkdirSync(hooksDir, { recursive: true });

  writeFileSync(join(claudeDir, "settings.json"), claudeSettingsTemplate());

  const hookPath = join(hooksDir, "install-deps-in-fresh-environment.sh");
  writeFileSync(hookPath, installDepsInFreshEnvironmentHookTemplate());
  chmodSync(hookPath, 0o755);
}

async function scaffoldCypressE2ETesting(
  targetDir: string,
  displayName: string,
): Promise<void> {
  mkdirSync(join(targetDir, "cypress", "e2e"), { recursive: true });
  writeFileSync(join(targetDir, "cypress.config.ts"), cypressConfigTemplate());
  writeFileSync(
    join(targetDir, "cypress", "tsconfig.json"),
    cypressTsconfigTemplate() + "\n",
  );
  writeFileSync(
    join(targetDir, "cypress", "e2e", "homepage.cy.ts"),
    homepageCypressTestTemplate(displayName),
  );
  return;
} // scaffoldCypressE2ETesting

export async function scaffold(
  projectName: string,
  targetDir: string,
  displayName: string,
  description: string,
  schemavaultsPackageVersions: Record<SchemaVaultsPackageDependency, string>,
  clientAppId: string,
  apiServerId: string,
): Promise<void> {
  // Create target directory
  if (existsSync(targetDir)) {
    console.error(`Target directory "${targetDir}" already exists!`);
    process.exit(1);
  } else {
    mkdirSync(targetDir);
  }

  // Create src/ directory
  const srcDir: string = join(targetDir, "src");
  mkdirSync(srcDir);

  // Create directories
  mkdirSync(join(srcDir, "db", "migrations"), { recursive: true });
  mkdirSync(join(srcDir, "lib"), { recursive: true });
  mkdirSync(join(targetDir, "public"), { recursive: true });

  // Write config files
  writeFileSync(
    join(targetDir, "package.json"),
    packageJsonTemplate(projectName, description, schemavaultsPackageVersions) +
      "\n",
  );
  writeFileSync(join(targetDir, "next.config.ts"), nextConfigTemplate());
  writeFileSync(
    join(targetDir, "tailwind.config.ts"),
    tailwindConfigTemplate(),
  );
  writeFileSync(join(targetDir, ".env.example"), exampleEnvTemplate());
  writeFileSync(
    join(targetDir, ".env.local"),
    envLocalTemplate(clientAppId, apiServerId),
  );
  writeFileSync(join(targetDir, "postcss.config.cjs"), postcssConfigTemplate());
  writeFileSync(join(targetDir, "tsconfig.json"), tsconfigTemplate() + "\n");
  writeFileSync(join(targetDir, ".gitignore"), GITIGNORE);
  writeFileSync(join(targetDir, ".dockerignore"), dockerignoreTemplate());
  writeFileSync(join(targetDir, "Dockerfile"), dockerfileTemplate());
  writeFileSync(
    join(targetDir, "docker-compose.yml"),
    dockerComposeTemplate(
      projectName,
      schemavaultsPackageVersions["@schemavaults/dbh"],
      versions["cypress"],
    ),
  );
  writeFileSync(join(targetDir, "README.md"), readmeTemplate(displayName));
  writeFileSync(join(targetDir, "eslint.config.cjs"), eslintConfigTemplate());

  // Next.js App Directory scaffolding
  scaffoldNextjsAppDirectory(projectName, srcDir, displayName, description);

  // db file scaffolding
  writeFileSync(join(srcDir, "db", "sql.ts"), sqlModuleTemplate());
  writeFileSync(
    join(srcDir, "db", "migrations", "00000-example-migration.ts"),
    exampleMigrationFileTemplate(),
  );
  writeFileSync(
    join(srcDir, "db", "database-table-types.ts"),
    databaseTableTypesTemplate(),
  );
  writeFileSync(
    join(srcDir, "db", "serverless-database.ts"),
    serverlessDatabaseTemplate(),
  );

  // route guard templates
  writeFileSync(
    join(srcDir, "lib", "withAuthenticatedApiRouteGuard.ts"),
    withAuthenticatedApiRouteGuardTemplate(),
  );
  writeFileSync(
    join(srcDir, "lib", "withAuthenticatedServerComponentRouteGuard.ts"),
    withAuthenticatedServerComponentRouteGuardTemplate(),
  );

  // cypress e2e scaffolding
  await scaffoldCypressE2ETesting(targetDir, displayName);

  // .claude folder scaffolding
  await scaffoldClaudeFolder(targetDir);
}
