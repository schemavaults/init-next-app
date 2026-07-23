import { existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { Command } from "commander";
import { z } from "zod";
import {
  appIdSchema,
  apiServerIdSchema,
} from "@schemavaults/app-definitions";
import { prompt } from "./prompt.js";
import { scaffold } from "./scaffold.js";
import { fetchSchemavaultsVersions } from "./npm-versions.js";

const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const deploymentSchema = z.enum(["vercel", "none"]);
type DeploymentStrategy = z.infer<typeof deploymentSchema>;

export const DEFAULT_AUTH_SERVER_URL = "https://auth.schemavaults.com";
const authServerUrlSchema = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//.test(value), {
    message: "must use http:// or https://",
  })
  .transform((value) => value.replace(/\/+$/, ""));

async function promptForDeployment(): Promise<DeploymentStrategy> {
  for (;;) {
    const value = await prompt("Deployment strategy (vercel/none): ");
    const parsed = deploymentSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error("Error: deployment must be one of: vercel, none.");
  }
}

async function promptForAuthServerUrl(): Promise<string> {
  for (;;) {
    const value = await prompt(
      `SCHEMAVAULTS_AUTH_SERVER_URL [${DEFAULT_AUTH_SERVER_URL}]: `,
    );
    if (!value) {
      return DEFAULT_AUTH_SERVER_URL;
    }
    const parsed = authServerUrlSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error(
      "Error: SCHEMAVAULTS_AUTH_SERVER_URL must be a valid http(s) URL.",
    );
  }
}

function formatIdIssues(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

async function promptForId(
  label: string,
  schema: z.ZodType<string, z.ZodTypeDef, string>,
): Promise<string> {
  for (;;) {
    const value = await prompt(`${label}: `);
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error(`Error: invalid ${label}. ${formatIdIssues(parsed.error)}`);
  }
}

const program = new Command()
  .argument("[project-name]", "directory name for the new project")
  .option("--display-name <name>", "human-readable project name")
  .option("--description <text>", "project description")
  .option(
    "--client-app-id <id>",
    "SCHEMAVAULTS_CLIENT_APP_ID for .env.local",
  )
  .option(
    "--api-server-id <id>",
    "SCHEMAVAULTS_API_SERVER_ID for .env.local",
  )
  .option(
    "--auth-server-url <url>",
    `SCHEMAVAULTS_AUTH_SERVER_URL for .env.local (defaults to ${DEFAULT_AUTH_SERVER_URL})`,
  )
  .option(
    "--deployment <deployment_strategy>",
    "deployment strategy: 'vercel' or 'none'",
  )
  .action(
    async (
      projectNameArg: string | undefined,
      opts: {
        displayName?: string;
        description?: string;
        clientAppId?: string;
        apiServerId?: string;
        authServerUrl?: string;
        deployment?: string;
      },
    ) => {
      let projectName = projectNameArg;

      if (!projectName) {
        projectName = await prompt("Project name: ");
      }

      if (!projectName) {
        console.error("Error: project name is required.");
        process.exit(1);
      }

      if (!NAME_RE.test(projectName)) {
        console.error(
          "Error: project name must only contain letters, numbers, hyphens, and underscores.",
        );
        process.exit(1);
      }

      let displayName = opts.displayName;
      if (!displayName) {
        displayName = await prompt("Display name: ");
      }

      if (!displayName) {
        console.error("Error: display name is required.");
        process.exit(1);
      }

      let description = opts.description;
      if (!description) {
        description = await prompt("Project description: ");
      }

      if (!description) {
        console.error("Error: project description is required.");
        process.exit(1);
      }

      let clientAppId = opts.clientAppId;
      if (clientAppId !== undefined) {
        const parsed = appIdSchema.safeParse(clientAppId);
        if (!parsed.success) {
          console.error(
            `Error: invalid --client-app-id. ${formatIdIssues(parsed.error)}`,
          );
          process.exit(1);
        }
        clientAppId = parsed.data;
      } else {
        clientAppId = await promptForId(
          "SCHEMAVAULTS_CLIENT_APP_ID",
          appIdSchema,
        );
      }

      let apiServerId = opts.apiServerId;
      if (apiServerId !== undefined) {
        const parsed = apiServerIdSchema.safeParse(apiServerId);
        if (!parsed.success) {
          console.error(
            `Error: invalid --api-server-id. ${formatIdIssues(parsed.error)}`,
          );
          process.exit(1);
        }
        apiServerId = parsed.data;
      } else {
        apiServerId = await promptForId(
          "SCHEMAVAULTS_API_SERVER_ID",
          apiServerIdSchema,
        );
      }

      let authServerUrl: string;
      if (opts.authServerUrl !== undefined) {
        const parsed = authServerUrlSchema.safeParse(opts.authServerUrl);
        if (!parsed.success) {
          console.error(
            "Error: --auth-server-url must be a valid http(s) URL.",
          );
          process.exit(1);
        }
        authServerUrl = parsed.data;
      } else {
        authServerUrl = await promptForAuthServerUrl();
      }

      let deployment: DeploymentStrategy;
      if (opts.deployment !== undefined) {
        const parsed = deploymentSchema.safeParse(opts.deployment);
        if (!parsed.success) {
          console.error(
            "Error: --deployment must be one of: vercel, none.",
          );
          process.exit(1);
        }
        deployment = parsed.data;
      } else {
        deployment = await promptForDeployment();
      }

      const targetDir = resolve(process.cwd(), projectName);

      if (existsSync(targetDir)) {
        console.error(`Error: directory "${projectName}" already exists.`);
        process.exit(1);
      }

      console.log("Fetching latest @schemavaults/* package versions...");
      const schemavaultsPackageVersions = await fetchSchemavaultsVersions();

      console.log(`\nCreating ${projectName}...`);
      await scaffold(
        projectName,
        targetDir,
        displayName,
        description,
        schemavaultsPackageVersions,
        clientAppId,
        apiServerId,
        authServerUrl,
        deployment,
      );

      console.log("Installing dependencies...");
      execSync("bun install", { cwd: targetDir, stdio: "inherit" });

      console.log("Running auth codegen...");
      execSync("bun run auth-codegen", { cwd: targetDir, stdio: "inherit" });

      // Add the @schemavaults/dbh Claude Code skill into the new project's
      // .claude/skills/ so coding agents know how to author migrations in the
      // format scaffolded above (numbered up()/down() files, the @/sql module,
      // the dbh CLI). --copy vendors real files (a committed repo can't rely on
      // symlinks into a global cache) and --agent makes the target deterministic
      // regardless of where the user runs this CLI from.
      const addSkillsCommand =
        "npx --yes skills add schemavaults/dbh --agent claude-code --copy --yes";
      console.log("Adding Claude Code skills for database migrations...");
      try {
        execSync(addSkillsCommand, { cwd: targetDir, stdio: "inherit" });
      } catch {
        console.warn(
          `\nWarning: failed to add Claude Code skills from schemavaults/dbh.\n` +
            `Your project is otherwise ready; add them later by running this inside ${projectName}/:\n` +
            `  ${addSkillsCommand}\n`,
        );
      }

      console.log(`
Done! Your project is ready.

Suggested Next Steps:

  1. Review .env.example to see the required environment variables.

  2. Set SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY before runtime.
     Generate keys here:
     ${authServerUrl}/apis/${apiServerId}/jwks-access-keys

  3. Set your Postgres credentials (POSTGRES_URL, POSTGRES_USER,
     POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE, etc.).

  4. Start the dev server:

       cd ${projectName}
       bun dev
`);
    },
  );

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
