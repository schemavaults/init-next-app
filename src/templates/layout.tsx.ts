export function layoutTemplate(
  displayName: string,
  description: string,
): string {
  return `import "@schemavaults/theme/globals.css";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

import {
  getAppEnvironment,
  getSchemavaultsApiServerId,
  getSchemavaultsClientApplicationId,
} from "@schemavaults/auth-server-sdk";
import ClientGlobalProviders from "./client-global-providers";


export const metadata: Metadata = {
  title: "${displayName}",
  description: "${description}",
};

export default function RootLayout({
  children,
}: PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <ClientGlobalProviders
          environment={getAppEnvironment()}
          api_server_id={getSchemavaultsApiServerId()}
          client_app_id={getSchemavaultsClientApplicationId()}
        >
          {children}
        </ClientGlobalProviders>
      </body>
    </html>
  );
}
`;
}

export default layoutTemplate;
