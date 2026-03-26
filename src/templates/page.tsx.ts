export function pageTemplate(displayName: string): string {
  return `"use client";
import Link from "next/link";
import type { ReactElement } from "react";

export default function IndexPage(): ReactElement {
  return (
    <main>
      <h1>Welcome to your new app: ${displayName}</h1>
      <Link href="/auth/login">Login</Link>
      <Link href="/auth/register">Register</Link>
    </main>
  );
}
`;
}
