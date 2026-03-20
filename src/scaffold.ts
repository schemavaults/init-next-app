import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { packageJsonTemplate } from "./templates/package.json.js";
import { nextConfigTemplate } from "./templates/next-config.js";
import { tsconfigTemplate } from "./templates/tsconfig.json.js";
import { layoutTemplate } from "./templates/layout.tsx.js";
import { pageTemplate } from "./templates/page.tsx.js";
import { sqlModuleTemplate } from "./templates/sql-module.js";
import { exampleMigrationFileTemplate } from "./templates/example-migration-file.js";

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

# typescript
*.tsbuildinfo
next-env.d.ts
`;

export function scaffold(projectName: string, targetDir: string): void {
  // Create directories
  mkdirSync(join(targetDir, "src", "app"), { recursive: true });
  mkdirSync(join(targetDir, "src", "db", "migrations"), { recursive: true });
  mkdirSync(join(targetDir, "public"), { recursive: true });

  // Write files
  writeFileSync(
    join(targetDir, "package.json"),
    packageJsonTemplate(projectName) + "\n",
  );
  writeFileSync(join(targetDir, "next.config.ts"), nextConfigTemplate());
  writeFileSync(join(targetDir, "tsconfig.json"), tsconfigTemplate() + "\n");
  writeFileSync(join(targetDir, ".gitignore"), GITIGNORE);
  writeFileSync(
    join(targetDir, "src", "app", "layout.tsx"),
    layoutTemplate(projectName),
  );
  writeFileSync(join(targetDir, "src", "app", "page.tsx"), pageTemplate());
  writeFileSync(join(targetDir, "src", "db", "sql.ts"), sqlModuleTemplate());
  writeFileSync(
    join(targetDir, "src", "db", "migrations", "00000-example-migration.ts"),
    exampleMigrationFileTemplate(),
  );
}
