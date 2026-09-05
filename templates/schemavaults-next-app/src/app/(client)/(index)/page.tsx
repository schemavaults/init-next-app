import "server-only";
import type { ReactElement } from "react";
import IndexPageView from "./view";
import { connection } from "next/server";

export default async function IndexPage(): Promise<ReactElement> {
  await connection();
  return <IndexPageView />
}
