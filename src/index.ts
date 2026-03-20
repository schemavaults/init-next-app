import { existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { Command } from "commander";
import { prompt } from "./prompt.js";
import { scaffold } from "./scaffold.js";

const NAME_RE = /^[a-zA-Z0-9_-]+$/;

const program = new Command()
  .argument("[project-name]", "directory name for the new project")
  .option("--display-name <name>", "human-readable project name")
  .option("--description <text>", "project description")
  .action(async (projectNameArg: string | undefined, opts: { displayName?: string; description?: string }) => {
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
        "Error: project name must only contain letters, numbers, hyphens, and underscores."
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

    const targetDir = resolve(process.cwd(), projectName);

    if (existsSync(targetDir)) {
      console.error(`Error: directory "${projectName}" already exists.`);
      process.exit(1);
    }

    console.log(`\nCreating ${projectName}...`);
    scaffold(projectName, targetDir, displayName, description);

    console.log("Installing dependencies...");
    execSync("bun install", { cwd: targetDir, stdio: "inherit" });

    console.log("Running auth codegen...");
    execSync("bun run auth-codegen", { cwd: targetDir, stdio: "inherit" });

    console.log(`
Done! Your project is ready.

  cd ${projectName}
  bun dev
`);
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
