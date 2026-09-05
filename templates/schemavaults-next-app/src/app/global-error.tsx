"use client";
import type { ReactElement } from "react";
import { ErrorPage } from "@schemavaults/ui";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps): ReactElement {
  return (
    <html lang="en">
      <body>
        <ErrorPage error={error} reset={reset} />
      </body>
    </html>
  );
}
