"use client";
import { useState, type ReactElement } from "react";
import { ErrorPage } from "@schemavaults/ui";
import themeOverrideStyleFromDocument from "@/lib/themeOverrideStyleFromDocument";
import "@schemavaults/theme/globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps): ReactElement {
  // Captured once: after the first commit this page's own <html> is the one in the DOM
  const [style] = useState(themeOverrideStyleFromDocument);
  return (
    <html lang="en" style={style}>
      <body>
        <ErrorPage error={error} reset={reset} />
      </body>
    </html>
  );
}
