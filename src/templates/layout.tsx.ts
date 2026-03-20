export function layoutTemplate(projectName: string): string {
  return `import "@schemavaults/theme/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "${projectName}",
  description: "Created with @schemavaults/init-next-app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`;
}
