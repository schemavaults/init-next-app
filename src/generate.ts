import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { applyTemplate, type IApplyTemplateResult } from "@jalexw/mould";
import type { SchemaVaultsPackageDependency } from "./npm-versions.js";

export const TEMPLATE_NAME = "schemavaults-next-app" as const;

/**
 * Absolute path of a template directory shipped in this package's `templates/`.
 * `../templates/` is correct both from `dist/index.js` and from `src/*.ts`, as
 * both sit one level below the package root.
 */
export function templateDirectory(name: string = TEMPLATE_NAME): string {
  const dir: string = fileURLToPath(new URL(`../templates/${name}/`, import.meta.url));
  if (!existsSync(join(dir, ".mouldconfig.json"))) {
    throw new Error(
      `Template '${name}' not found at ${dir} (expected a .mouldconfig.json there)`,
    );
  }
  return dir;
}

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

function readPackageJson(path: string): PackageJsonLike {
  const parsed: unknown = JSON.parse(readFileSync(path, { encoding: "utf-8" }));
  if (typeof parsed !== "object" || parsed === null) {
    throw new TypeError(`Expected ${path} to contain a JSON object`);
  }
  return parsed as PackageJsonLike;
}

/**
 * The template's package.json pins real versions so the template directory
 * installs and type-checks on its own. Some of those versions are also needed
 * as mould inputs (docker-compose image tags), so they are read from here
 * rather than duplicated.
 */
export function readTemplateVersions(templateDir: string): { cypress: string } {
  const pkg: PackageJsonLike = readPackageJson(join(templateDir, "package.json"));
  const cypress: string | undefined = pkg.devDependencies?.["cypress"];
  if (typeof cypress !== "string" || !cypress) {
    throw new Error(
      "The template's package.json has no devDependencies.cypress entry to derive the docker-compose image tag from",
    );
  }
  return { cypress };
}

/**
 * Overwrite the rendered package.json's `@schemavaults/*` versions with the
 * latest ones fetched from npm. Each key must already exist in the template's
 * dependencies — a missing key means the template and this list have drifted.
 */
export function patchSchemavaultsVersions(
  targetDir: string,
  versions: Record<SchemaVaultsPackageDependency, string>,
): void {
  const packageJsonPath: string = join(targetDir, "package.json");
  const pkg: PackageJsonLike = readPackageJson(packageJsonPath);
  const dependencies: Record<string, string> | undefined = pkg.dependencies;
  if (!dependencies) {
    throw new Error(`${packageJsonPath} has no "dependencies" field`);
  }
  for (const [name, version] of Object.entries(versions)) {
    if (!(name in dependencies)) {
      throw new Error(
        `Expected the template package.json to depend on ${name}; the template and the fetched package list have drifted`,
      );
    }
    dependencies[name] = version;
  }
  writeFileSync(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, {
    encoding: "utf-8",
  });
}

export interface GenerateProjectOptions {
  targetDir: string;
  projectName: string;
  displayName: string;
  description: string;
  clientAppId: string;
  apiServerId: string;
  authServerUrl: string;
  deployment: "vercel" | "none";
  schemavaultsPackageVersions: Record<SchemaVaultsPackageDependency, string>;
}

/**
 * Render the `schemavaults-next-app` mould template into `targetDir`, then
 * patch in the freshly fetched `@schemavaults/*` versions.
 */
export async function generateProject(
  options: GenerateProjectOptions,
): Promise<IApplyTemplateResult> {
  const templatePath: string = templateDirectory();
  const templateVersions = readTemplateVersions(templatePath);

  const result: IApplyTemplateResult = await applyTemplate({
    templatePath,
    outputPath: options.targetDir,
    inputs: {
      project_name: options.projectName,
      display_name: options.displayName,
      description: options.description,
      client_app_id: options.clientAppId,
      api_server_id: options.apiServerId,
      auth_server_url: options.authServerUrl,
      deployment: options.deployment,
      dbh_version: options.schemavaultsPackageVersions["@schemavaults/dbh"],
      cypress_version: templateVersions.cypress,
    },
    onWarning: (message: string): void => {
      console.warn(`Warning: ${message}`);
    },
  });

  patchSchemavaultsVersions(options.targetDir, options.schemavaultsPackageVersions);

  return result;
}
