import { existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { Command } from "commander";
import { z } from "zod";
import {
  appIdSchema,
  apiServerIdSchema,
} from "@schemavaults/app-definitions";
import { MouldError } from "@jalexw/mould";
import { prompt } from "./prompt.js";
import { generateProject } from "./generate.js";
import { fetchSchemavaultsVersions } from "./npm-versions.js";
import {
  AUTH_SERVER_APP_ID_PATH,
  prefillAuthServerAppId,
} from "./auth-server-app-id.js";

const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const deploymentSchema = z.enum(["vercel", "none"]);
type DeploymentStrategy = z.infer<typeof deploymentSchema>;
const blobStorageSchema = z.enum(["s3", "none"]);
type BlobStorage = z.infer<typeof blobStorageSchema>;

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

async function promptForBlobStorage(): Promise<BlobStorage> {
  for (;;) {
    const value = await prompt("Blob storage (s3/none) [none]: ");
    if (!value) {
      return "none";
    }
    const parsed = blobStorageSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error("Error: blob storage must be one of: s3, none.");
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

function formatIdIssues(error: z.ZodError<string>): string {
  return error.issues.map((issue) => issue.message).join(" ");
}

async function promptForAuthServerAppId(
  authServerUrl: string,
): Promise<string> {
  console.log(
    `Fetching the auth server's app id from ${authServerUrl}${AUTH_SERVER_APP_ID_PATH}...`,
  );
  const defaultAppId: string = await prefillAuthServerAppId(authServerUrl);
  for (;;) {
    const value = await prompt(
      `SCHEMAVAULTS_AUTH_SERVER_APP_ID [${defaultAppId}]: `,
    );
    if (!value) {
      return defaultAppId;
    }
    const parsed = appIdSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error(
      `Error: invalid SCHEMAVAULTS_AUTH_SERVER_APP_ID. ${formatIdIssues(parsed.error)}`,
    );
  }
}

async function promptForId(
  label: string,
  schema: z.ZodType<string>,
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
    "--auth-server-app-id <id>",
    `SCHEMAVAULTS_AUTH_SERVER_APP_ID for .env.local and .env.example (when prompted, defaults to the id the auth server publishes at ${AUTH_SERVER_APP_ID_PATH})`,
  )
  .option(
    "--deployment <deployment_strategy>",
    "deployment strategy: 'vercel' or 'none'",
  )
  .option(
    "--blob-storage <provider>",
    "blob storage: 's3' (S3 client + local S3 service in docker-compose.yml) or 'none' (default when prompted)",
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
        authServerAppId?: string;
        deployment?: string;
        blobStorage?: string;
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

      let authServerAppId: string;
      if (opts.authServerAppId !== undefined) {
        const parsed = appIdSchema.safeParse(opts.authServerAppId);
        if (!parsed.success) {
          console.error(
            `Error: invalid --auth-server-app-id. ${formatIdIssues(parsed.error)}`,
          );
          process.exit(1);
        }
        authServerAppId = parsed.data;
      } else {
        authServerAppId = await promptForAuthServerAppId(authServerUrl);
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

      let blobStorage: BlobStorage;
      if (opts.blobStorage !== undefined) {
        const parsed = blobStorageSchema.safeParse(opts.blobStorage);
        if (!parsed.success) {
          console.error(
            "Error: --blob-storage must be one of: s3, none.",
          );
          process.exit(1);
        }
        blobStorage = parsed.data;
      } else {
        blobStorage = await promptForBlobStorage();
      }

      const targetDir = resolve(process.cwd(), projectName);

      if (existsSync(targetDir)) {
        console.error(`Error: directory "${projectName}" already exists.`);
        process.exit(1);
      }

      console.log("Fetching latest @schemavaults/* package versions...");
      const schemavaultsPackageVersions = await fetchSchemavaultsVersions();

      console.log(`\nCreating ${projectName}...`);
      try {
        await generateProject({
          targetDir,
          projectName,
          displayName,
          description,
          clientAppId,
          apiServerId,
          authServerUrl,
          authServerAppId,
          deployment,
          blobStorage,
          schemavaultsPackageVersions,
        });
      } catch (err: unknown) {
        if (err instanceof MouldError) {
          console.error(`Error: ${err.message}`);
          process.exit(1);
        }
        throw err;
      }

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

      const nextSteps: string[] = [
        "Review .env.example to see the required environment variables.",
        `Set SCHEMAVAULTS_AUTH_JWKS_ACCESS_PRIVATE_KEY before runtime.
     Generate keys here:
     ${authServerUrl}/apis/${apiServerId}/jwks-access-keys`,
        `Set your Postgres credentials (POSTGRES_URL, POSTGRES_USER,
     POSTGRES_HOST, POSTGRES_PASSWORD, POSTGRES_DATABASE, etc.).`,
      ];
      if (blobStorage === "s3") {
        nextSteps.push(
          `Set your production S3 bucket and credentials (S3_BUCKET, S3_REGION,
     S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, etc.). .env.local already
     points at the local S3 service in docker-compose.yml.`,
          `Start the local S3 service and the dev server:

       cd ${projectName}
       docker compose up -d --wait s3
       bun dev`,
        );
      } else {
        nextSteps.push(`Start the dev server:

       cd ${projectName}
       bun dev`);
      }

      console.log(`
Done! Your project is ready.

Suggested Next Steps:

${nextSteps.map((step, index) => `  ${index + 1}. ${step}`).join("\n\n")}
`);
    },
  );

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
