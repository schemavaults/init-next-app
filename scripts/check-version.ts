/**
 * Fails unless package.json's version can be published. CI runs `npm publish`
 * on every push to main and npm rejects a version that already exists, so this
 * runs on pull requests to catch a missing bump before it is merged. See
 * .claude/skills/commit-changes for how to choose the bump.
 */
import packageJson from "../package.json";

const { name, version } = packageJson;

interface NpmViewOutput {
  versions?: string | string[];
  "dist-tags"?: Record<string, string>;
  error?: { code?: string; summary?: string };
}

async function viewPublished(): Promise<{ versions: string[]; latest?: string }> {
  const proc = Bun.spawn(["npm", "view", name, "versions", "dist-tags", "--json"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const output: NpmViewOutput = stdout.trim() ? JSON.parse(stdout) : {};
  if (exitCode !== 0) {
    // Never published: any version can be
    if (output.error?.code === "E404") return { versions: [] };
    throw new Error(`npm view ${name} failed (exit ${exitCode}):\n${stderr}`);
  }
  // npm prints a bare string instead of an array when only one version exists
  return { versions: [output.versions ?? []].flat(), latest: output["dist-tags"]?.latest };
}

const { versions, latest } = await viewPublished();
const howToFix =
  "Raise it with `npm version patch --no-git-tag-version` (minor for a breaking change while 0.x); " +
  "see .claude/skills/commit-changes.";

if (versions.includes(version)) {
  console.error(`${name}@${version} is already published, so merging this would fail the publish job. ${howToFix}`);
  process.exit(1);
}
if (latest && Bun.semver.order(version, latest) !== 1) {
  console.error(`package.json version ${version} is not greater than the latest published version ${latest}. ${howToFix}`);
  process.exit(1);
}
console.log(`ok: ${name}@${version} is unpublished and greater than the latest published version (${latest ?? "none"})`);
