import { existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { Command } from "commander";
import { z } from "zod";
import { prompt } from "./prompt.js";
import { scaffold } from "./scaffold.js";
import { fetchSchemavaultsVersions } from "./npm-versions.js";

const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const uuidSchema = z.string().uuid();

async function promptForUuid(label: string): Promise<string> {
  for (;;) {
    const value = await prompt(`${label}: `);
    const parsed = uuidSchema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    console.error(`Error: ${label} must be a valid UUID.`);
  }
}

const program = new Command()
  .argument("[project-name]", "directory name for the new project")
  .option("--display-name <name>", "human-readable project name")
  .option("--description <text>", "project description")
  .option(
    "--client-app-id <uuid>",
    "SCHEMAVAULTS_CLIENT_APP_ID (uuid) for .env.local",
  )
  .option(
    "--api-server-id <uuid>",
    "SCHEMAVAULTS_API_SERVER_ID (uuid) for .env.local",
  )
  .action(
    async (
      projectNameArg: string | undefined,
      opts: {
        displayName?: string;
        description?: string;
        clientAppId?: string;
        apiServerId?: string;
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
        const parsed = uuidSchema.safeParse(clientAppId);
        if (!parsed.success) {
          console.error("Error: --client-app-id must be a valid UUID.");
          process.exit(1);
        }
        clientAppId = parsed.data;
      } else {
        clientAppId = await promptForUuid("SCHEMAVAULTS_CLIENT_APP_ID (uuid)");
      }

      let apiServerId = opts.apiServerId;
      if (apiServerId !== undefined) {
        const parsed = uuidSchema.safeParse(apiServerId);
        if (!parsed.success) {
          console.error("Error: --api-server-id must be a valid UUID.");
          process.exit(1);
        }
        apiServerId = parsed.data;
      } else {
        apiServerId = await promptForUuid("SCHEMAVAULTS_API_SERVER_ID (uuid)");
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
      );

      console.log("Installing dependencies...");
      execSync("bun install", { cwd: targetDir, stdio: "inherit" });

      console.log("Running auth codegen...");
      execSync("bun run auth-codegen", { cwd: targetDir, stdio: "inherit" });

      console.log(`
Done! Your project is ready.

  cd ${projectName}
  bun dev
`);
    },
  );

program.parseAsync().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
