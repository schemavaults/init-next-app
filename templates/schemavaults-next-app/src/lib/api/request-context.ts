/**
 * Per-request context handed to every API operation handler as
 * `ctx.context` (and to the auth resolvers). Built by the operations app
 * before credentials are resolved, so it must stay cheap: the database
 * handle is only opened when a handler first touches `ctx.context.dbh`,
 * and released by `dispose()` once the response has been produced.
 */
import {
  getAppEnvironment,
  type SchemaVaultsAppEnvironment,
} from "@schemavaults/auth-server-sdk";
import { ServerlessDatabase } from "@/db/serverless-database";

export class ApiRequestContext {
  readonly environment: SchemaVaultsAppEnvironment;
  private database: ServerlessDatabase | null = null;

  constructor() {
    this.environment = getAppEnvironment();
  }

  /** Lazily opened Kysely handle for this request. */
  get dbh(): ServerlessDatabase {
    this.database ??= ServerlessDatabase.createDBH();
    return this.database;
  }

  async dispose(): Promise<void> {
    const database = this.database;
    this.database = null;
    if (database) {
      await database.destroy();
    }
  }
}

export function createApiRequestContext(): ApiRequestContext {
  return new ApiRequestContext();
}

export function disposeApiRequestContext(context: ApiRequestContext): Promise<void> {
  return context.dispose();
}
