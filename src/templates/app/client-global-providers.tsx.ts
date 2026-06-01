export function clientGlobalProvidersTemplate(): string {
  return `"use client";
import type { PropsWithChildren } from "react";
import { BrightnessThemeProvider, Toaster, LazyFramerMotionProvider, TooltipProvider } from "@schemavaults/ui";

export default function ClientGlobalProviders({
  children
}: PropsWithChildren) {
  return (
    <BrightnessThemeProvider
      enableSystem
      attribute={"class"}
      defaultTheme="system"
    >
      <LazyFramerMotionProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
      </LazyFramerMotionProvider>
    </BrightnessThemeProvider>
  );
}
`;
}

export default clientGlobalProvidersTemplate;
