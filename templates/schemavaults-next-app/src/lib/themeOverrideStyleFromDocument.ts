import { THEME_OVERRIDE_VARIABLE_PREFIX } from "@schemavaults/theme/tokens";
import type { CSSProperties } from "react";

/**
 * The `--sv-theme-*` custom properties that `themeOverrideStyle()` put on the
 * <html> element, read back from the DOM.
 *
 * `global-error.tsx` must be a Client Component, so it cannot read the
 * `THEME_*` environment variables itself. It renders in place of the root
 * layout, whose <html> still carries the overrides until React commits the
 * error page, so call this while rendering (e.g. in a `useState`
 * initializer) to carry them over. Empty on the server, and when the root
 * layout never rendered.
 */
export default function themeOverrideStyleFromDocument(): CSSProperties {
  if (typeof document === "undefined") return {};
  const { style } = document.documentElement;
  const overrides: Record<string, string> = {};
  for (let i = 0; i < style.length; i++) {
    const property: string = style.item(i);
    if (property.startsWith(`${THEME_OVERRIDE_VARIABLE_PREFIX}-`)) {
      overrides[property] = style.getPropertyValue(property);
    }
  }
  return overrides;
}
