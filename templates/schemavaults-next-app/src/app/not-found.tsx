import type { ReactElement } from "react";
import { ErrorPage } from "@schemavaults/ui";

export default function NotFound(): ReactElement {
  return <ErrorPage error={404} message="Page not found" />;
}
