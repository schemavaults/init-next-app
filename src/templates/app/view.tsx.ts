export function clientViewTemplate(displayName: string): string {
  return `"use client";
import type { ReactElement } from "react";
import { Button } from "@schemavaults/ui";
import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";

export default function IndexPageView(): ReactElement {
  return (
    <main className="w-full h-dvh flex flex-col items-center justify-center flex-nowrap gap-4">
      <h1>Welcome to your new app: ${displayName}</h1>
      <div className="flex flex-row gap-4 items-center justify-center w-full">
        <Link href="/auth/login">
          <Button className="flex flex-row gap-2 items-center justify-content">
            <LogIn />
            Login
          </Button>
        </Link>
        <Link href="/auth/register">
          <Button className="flex flex-row gap-2 items-center justify-content">
            <UserPlus />
            Register
          </Button>
        </Link>
      </div>
    </main>
  );
}
`;
}
