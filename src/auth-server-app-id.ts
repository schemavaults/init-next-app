import { z } from "zod";
import {
  appIdSchema,
  DEFAULT_AUTH_SERVER_APP_ID,
} from "@schemavaults/app-definitions";

export { DEFAULT_AUTH_SERVER_APP_ID };

/** The auth server's public endpoint that publishes its own app id. */
export const AUTH_SERVER_APP_ID_PATH = "/api/config/app-id";

const appIdConfigResponseSchema = z.object({
  data: z.object({ app_id: z.string() }),
});

function describeError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  // Node's fetch reports every network failure as "fetch failed"; the
  // reason (ENOTFOUND, ECONNREFUSED, ...) is on its cause.
  const cause: unknown = err.cause;
  if (cause instanceof Error && cause.message) {
    return `${err.message}: ${cause.message}`;
  }
  return err.message;
}

/**
 * Read the app id that the auth server at `authServerUrl` publishes for
 * itself (its SCHEMAVAULTS_AUTH_SERVER_APP_ID).
 *
 * @throws when the request fails or the response holds no valid app id
 */
export async function fetchAuthServerAppId(
  authServerUrl: string,
  timeoutMs: number = 10_000,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${authServerUrl}${AUTH_SERVER_APP_ID_PATH}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    throw new Error(`request failed (${describeError(err)})`);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`.trim());
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("the response is not JSON");
  }
  const envelope = appIdConfigResponseSchema.safeParse(body);
  if (!envelope.success) {
    throw new Error("the response has no data.app_id");
  }
  const appId = appIdSchema.safeParse(envelope.data.data.app_id);
  if (!appId.success) {
    throw new Error(
      `"${envelope.data.data.app_id}" is not a valid app id`,
    );
  }
  return appId.data;
}

/**
 * The value to prefill the SCHEMAVAULTS_AUTH_SERVER_APP_ID prompt with: the
 * id the auth server publishes, or `schemavaults-auth` (with a warning) when
 * it cannot be fetched, e.g. from an auth server that predates the endpoint.
 */
export async function prefillAuthServerAppId(
  authServerUrl: string,
): Promise<string> {
  try {
    return await fetchAuthServerAppId(authServerUrl);
  } catch (err: unknown) {
    console.warn(
      `Warning: could not fetch the auth server's app id from ${authServerUrl}${AUTH_SERVER_APP_ID_PATH}: ` +
        `${describeError(err)}. Defaulting to "${DEFAULT_AUTH_SERVER_APP_ID}".`,
    );
    return DEFAULT_AUTH_SERVER_APP_ID;
  }
}
