export function exampleAuthenticatedHomepageTemplate(
  displayName: string,
): string {
  return `import "server-only";
import Link from "next/link";
import type { ReactElement } from "react";
import withAuthenticatedServerComponentRouteGuard, { type IProtectedAuthenticatedServerComponentPageProps } from "@/lib/withAuthenticatedServerComponentRouteGuard";
import { connection } from "next/server";

function ExampleLoggedInHomepageView(): ReactElement {
  return (
    <main>
      <h1>You are logged in to ${displayName}!</h1>
      <Link href="/auth/logout">Logout</Link>
    </main>
  );
}

export default async function ExampleLoggedInHomepageServerComponent(): Promise<ReactElement> {
  await connection();
  return await withAuthenticatedServerComponentRouteGuard(
    async function View(props: IProtectedAuthenticatedServerComponentPageProps): Promise<ReactElement> {
      return (
        <ExampleLoggedInHomepageView />
      );
    }
  );
}
`;
}

export default exampleAuthenticatedHomepageTemplate;
