
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";
import ClientGlobalProviders from "./client-global-providers";
import "@schemavaults/theme/globals.css";

export const metadata: Metadata = {
  title: "xxx_display_name_xxx",
  description: "xxx_description_xxx",
};

export default function RootLayout({
  children,
}: PropsWithChildren) {
  return (
    <html
      lang="en"
      className="overscroll-none w-full min-h-dvh"
      suppressHydrationWarning
    >
      <body className="bg-background w-full min-h-dvh">
        <ClientGlobalProviders>
          {children}
        </ClientGlobalProviders>
      </body>
    </html>
  );
}
