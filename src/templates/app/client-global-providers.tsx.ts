export function clientGlobalProvidersTemplate(): string {
  return `"use client";
import type { PropsWithChildren } from "react";
import { Toaster, LazyFramerMotionProvider, TooltipProvider } from "@schemavaults/ui";

export default function ClientGlobalProviders({
  children
}: PropsWithChildren) {
  return (
    <LazyFramerMotionProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
      <Toaster />
    </LazyFramerMotionProvider>
  );
}
`;
}

export default clientGlobalProvidersTemplate;
