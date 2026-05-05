import { retryWithBackoff } from "./retry.js";

const SCHEMAVAULTS_PACKAGES = [
  "@schemavaults/ui",
  "@schemavaults/theme",
  "@schemavaults/dbh",
  "@schemavaults/auth-server-sdk",
  "@schemavaults/auth-react-provider",
] as const;

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

class TerminalFetchError extends Error {}

async function fetchLatestVersionOnce(pkg: string): Promise<string> {
  const url = `https://registry.npmjs.org/${pkg}/latest`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch (cause) {
    throw new Error(
      `Failed to fetch latest version for ${pkg}: network error (${String(cause)})`,
    );
  }
  if (!res.ok) {
    const msg = `Failed to fetch latest version for ${pkg}: HTTP ${res.status} ${res.statusText}`;
    if (res.status >= 400 && res.status < 500) throw new TerminalFetchError(msg);
    throw new Error(msg);
  }
  const body = (await res.json()) as { version?: unknown };
  const version = body.version;
  if (typeof version !== "string") {
    throw new TerminalFetchError(
      `Failed to fetch latest version for ${pkg}: response missing string "version" field`,
    );
  }
  if (!SEMVER_RE.test(version)) {
    throw new TerminalFetchError(
      `Failed to fetch latest version for ${pkg}: "${version}" is not valid semver`,
    );
  }
  return version;
}

async function fetchLatestVersion(pkg: string): Promise<string> {
  return retryWithBackoff(() => fetchLatestVersionOnce(pkg), {
    shouldRetry: (err) => !(err instanceof TerminalFetchError),
    onRetry: (err, attempt, delayMs) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[npm-versions] ${pkg} attempt ${attempt} failed (${message}); retrying in ${delayMs}ms`,
      );
    },
  });
}

export async function fetchSchemavaultsVersions(): Promise<
  Record<string, string>
> {
  const entries = await Promise.all(
    SCHEMAVAULTS_PACKAGES.map(
      async (pkg) => [pkg, await fetchLatestVersion(pkg)] as const,
    ),
  );
  return Object.fromEntries(entries);
}
