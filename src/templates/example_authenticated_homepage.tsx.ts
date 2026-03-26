export function exampleAuthenticatedHomepageTemplate(
  displayName: string,
): string {
  return `"use client";
import Link from "next/link";
import type { ReactElement } from "react";

export default function ExampleLoggedInHomepage(): ReactElement {
  return (
    <main>
      <h1>You are logged in to ${displayName}!</h1>
      <Link href="/auth/logout">Logout</Link>
    </main>
  );
}
`;
}

export default exampleAuthenticatedHomepageTemplate;
