export function withAuthenticatedServerComponentRouteGuardTemplate(): string {
  return `import "server-only";

import {
  withAuthenticatedServerComponentRouteGuard as _withAuthenticatedServerComponentRouteGuard,
  type TProtectedAuthenticatedPageServerComponent,
  type IBaseProtectedAuthenticatedServerComponentPageProps,
} from "@schemavaults/auth-server-sdk/route_guards";
import { ServerlessDatabase } from "@/db/serverless-database";

export interface IProtectedAuthenticatedServerComponentPageProps extends IBaseProtectedAuthenticatedServerComponentPageProps {
  dbh: ServerlessDatabase;
}

export async function withAuthenticatedServerComponentRouteGuard(
  server_component: TProtectedAuthenticatedPageServerComponent<IProtectedAuthenticatedServerComponentPageProps>
) {
  await using dbh = ServerlessDatabase.createDBH();
  return _withAuthenticatedServerComponentRouteGuard<IProtectedAuthenticatedServerComponentPageProps>(
    server_component,
    {
      dbh
    }
  );
}

export default withAuthenticatedServerComponentRouteGuard;
`;
}

export default withAuthenticatedServerComponentRouteGuardTemplate;
