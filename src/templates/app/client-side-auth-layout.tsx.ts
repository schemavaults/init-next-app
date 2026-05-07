export function clientSideAuthLayoutTemplate(): string {
  return `import "server-only";
import type { PropsWithChildren, ReactElement } from "react";
import AppAuthProvider from "@/app/(client)/auth/auth-provider";
import {
  getAppEnvironment,
  getSchemavaultsApiServerId,
  getSchemavaultsClientApplicationId,
} from "@schemavaults/auth-server-sdk";
import { connection } from "next/server";

export default function ClientSideAuthLayout({
  children,
}: PropsWithChildren): ReactElement {
  await connection();
  const environment = getAppEnvironment();
  const app_id = getSchemavaultsClientApplicationId();
  const api_server_id = getSchemavaultsApiServerId();

  return (
    <AppAuthProvider
      environment={environment}
      app_id={app_id}
      default_audiences={[api_server_id]}
      authed_on_unauthed_redirect_uri="/home"
      unauthed_on_authed_redirect_uri="/auth/login"
      successful_logout_redirect_uri="/"
      successful_authentication_redirect_uri="/home"
      authorize_uri="/auth/authorize"
    >
      {children}
    </AppAuthProvider>
  );
}
`;
}

export default clientSideAuthLayoutTemplate;
