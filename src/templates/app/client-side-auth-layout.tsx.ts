export function clientSideAuthLayoutTemplate(): string {
  return `"use client";
import type { PropsWithChildren, ReactElement } from "react";
import AuthProvider from "@/app/auth/auth-provider";

import {
  getAppEnvironment,
  getSchemavaultsApiServerId,
  getSchemavaultsClientApplicationId,
} from "@schemavaults/auth-server-sdk";

export interface ClientLayoutProps extends PropsWithChildren {
  client_app_id: AppId;
  api_server_id: ApiServerId;
  environment: SchemaVaultsAppEnvironment;
}

export default function ClientSideAuthLayout({
  children,
}: PropsWithChildren): ReactElement {
  return (
    <AuthProvider
      environment={environment}
      app_id={client_app_id}
      default_audiences={[api_server_id]}
      authed_on_unauthed_redirect_uri="/home"
      unauthed_on_authed_redirect_uri="/auth/login"
      successful_logout_redirect_uri="/"
      successful_authentication_redirect_uri="/home"
      authorize_uri="/auth/authorize"
    >
      {children}
    </AuthProvider>
  );
}
`;
}

export default clientSideAuthLayoutTemplate;
