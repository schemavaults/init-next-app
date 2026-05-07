export function rootLayoutTemplate(
  displayName: string,
  description: string,
): string {
  return `
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import ClientGlobalProviders from "./client-global-providers";
import "@schemavaults/theme/globals.css";

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
        <ClientGlobalProviders>
          {children}
        </ClientGlobalProviders>
      </body>
    </html>
  );
}
`;
}

export default rootLayoutTemplate;
