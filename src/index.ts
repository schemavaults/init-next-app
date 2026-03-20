import { existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { prompt } from "./prompt.js";
import { scaffold } from "./scaffold.js";

const NAME_RE = /^[a-zA-Z0-9_-]+$/;

async function main() {
  let projectName = process.argv[2];

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

  const displayName = await prompt("Display name: ");

  if (!displayName) {
    console.error("Error: display name is required.");
    process.exit(1);
  }

  const description = await prompt("Project description: ");

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
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
