export function clientGlobalProvidersTemplate(): string {
  return `
import type { PropsWithChildren } from "react";
import AuthProvider from "./auth/auth-provider";
import { Toaster } from "@schemavaults/ui";
import type {
  ApiServerId,
  AppId,
  SchemaVaultsAppEnvironment,
} from "@schemavaults/auth-react-provider";

export interface ClientLayoutProps extends PropsWithChildren {
  client_app_id: AppId;
  api_server_id: ApiServerId;
  environment: SchemaVaultsAppEnvironment;
}

export default function ClientGlobalProviders({
  children,
  environment,
  client_app_id,
  api_server_id
}: ClientLayoutProps) {
  return (
    <>
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
      <Toaster />
    </>
  );
}
`;
}

export default clientGlobalProvidersTemplate;
