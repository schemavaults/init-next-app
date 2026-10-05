import type { Metadata } from "next";
import type { ReactElement } from "react";
import { connection } from "next/server";
import { ErrorPage } from "@schemavaults/ui";
import ClientGlobalProviders from "./client-global-providers";
import themeOverrideStyle from "@/lib/themeOverrideStyle";
import appWordmarkProps from "@/lib/appWordmarkProps";
import "@schemavaults/theme/globals.css";

export const metadata: Metadata = {
  title: "Page not found | xxx_display_name_xxx",
  description: "xxx_description_xxx",
};

/**
 * The 404 page for URLs that match no route (`experimental.globalNotFound`
 * in next.config.ts). Next.js returns it without rendering the root layout,
 * so it sets up the document, stylesheet, theme overrides and providers
 * itself. A `notFound()` call inside a route still renders `not-found.tsx`.
 */
export default async function GlobalNotFound(): Promise<ReactElement> {
  // Render per request, like the other pages, so the THEME_* variables are
  // read at runtime rather than baked in when the page is prerendered
  await connection();
  return (
    <html
      lang="en"
      className="overscroll-none w-full min-h-dvh"
      style={themeOverrideStyle()}
      suppressHydrationWarning
    >
      <body className="bg-background w-full min-h-dvh">
        <ClientGlobalProviders>
          <ErrorPage error={404} message="Page not found" wordmarkProps={appWordmarkProps} />
        </ClientGlobalProviders>
      </body>
    </html>
  );
}
