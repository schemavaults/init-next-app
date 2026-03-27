export function exampleAuthenticatedHomepageTemplate(
  displayName: string,
): string {
  return `import "server-only";
import Link from "next/link";
import type { ReactElement } from "react";
import withAuthenticatedServerComponentRouteGuard, { type IProtectedAuthenticatedServerComponentPageProps } from "@/lib/withAuthenticatedServerComponentRouteGuard";
import { connection } from "next/server";
import { Button } from "@schemavaults/ui";

function ExampleLoggedInHomepageView(): ReactElement {
  return (
    <main className="flex flex-col flex-nowrap items-center justify-center gap-4 w-full h-dvh">
      <h1>You are logged in to ${displayName}!</h1>
      <div className="flex flex-row gap-4 items-center justify-center">
        <Link href="/auth/logout">
          <Button>Logout</Button>
        </Link>
      </div>
    </main>
  );
}

export default async function ExampleLoggedInHomepageServerComponent(): Promise<ReactElement> {
  await connection();
  return await withAuthenticatedServerComponentRouteGuard(
    async function View(props: IProtectedAuthenticatedServerComponentPageProps): Promise<ReactElement> {
      void props;
      return (
        <ExampleLoggedInHomepageView />
      );
    }
  );
}
`;
}

export default exampleAuthenticatedHomepageTemplate;
