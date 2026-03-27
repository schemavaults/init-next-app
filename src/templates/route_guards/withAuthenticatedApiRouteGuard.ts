export function withAuthenticatedApiRouteGuardTemplate(): string {
  return `import "server-only";

import {
  withAuthenticatedApiRouteGuard as _withAuthenticatedApiRouteGuard,
  type TProtectedAuthenticatedApiRoute,
  type IBaseProtectedAuthenticatedApiRouteInputs,
} from "@schemavaults/auth-server-sdk/route_guards";
import { ServerlessDatabase } from "@/db/serverless-database";

import { type NextRequest, NextResponse } from "next/server";

export interface IAuthenticatedApiRouteGuardInputs extends IBaseProtectedAuthenticatedApiRouteInputs {
  dbh: ServerlessDatabase
}

export type { IAuthenticatedApiRouteGuardInputs as IProtectedAuthenticatedApiRouteProps };

export async function withAuthenticatedApiRouteGuard(
  api_route_handler: TProtectedAuthenticatedApiRoute<IAuthenticatedApiRouteGuardInputs>
): Promise<(req: NextRequest) => Promise<NextResponse>> {
  await using dbh = ServerlessDatabase.createDBH();
  return _withAuthenticatedApiRouteGuard<IAuthenticatedApiRouteGuardInputs>(
    api_route_handler,
    { dbh }
  );
}

export default withAuthenticatedApiRouteGuard;
`;
}

export default withAuthenticatedApiRouteGuardTemplate;
