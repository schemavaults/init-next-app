export function pageTemplate(displayName: string): string {
  return `"use client";
import type { ReactElement } from "react";
import { Button } from "@schemavaults/ui";
import Link from "next/link";

export default function IndexPage(): ReactElement {
  return (
    <main className="w-full h-dvh flex flex-col items-center justify-center flex-nowrap gap-4">
      <h1>Welcome to your new app: ${displayName}</h1>
      <div className="flex flex-row gap-4 items-center justify-center w-full">
        <Link href="/auth/login">
          <Button>Login</Button>
        </Link>
        <Link href="/auth/register">
          <Button>Register</Button>
        </Link>
      </div>
    </main>
  );
}
`;
}
