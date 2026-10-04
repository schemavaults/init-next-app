import "server-only";
import {
  createThemeOverrideStyle,
  themeOverridesFromEnvironment,
} from "@schemavaults/theme/tokens";
import type { CSSProperties } from "react";

/**
 * Reads the deployment's `THEME_*` environment variables (e.g.
 * `THEME_LIGHT_SIDEBAR_ACTIVE_START`) into the `--sv-theme-*` custom
 * properties that `@schemavaults/theme/globals.css` reads its tokens from.
 * Spread onto the <html> element's `style`; tokens without a variable keep
 * the stylesheet default.
 */
export default function themeOverrideStyle(): CSSProperties {
  const { overrides, problems } = themeOverridesFromEnvironment(process.env, {
    prefix: "THEME",
  });
  for (const problem of problems) {
    console.warn(
      `Ignoring theme override ${problem.variable}=${JSON.stringify(problem.value)}: ${problem.reason}`,
    );
  }
  return createThemeOverrideStyle(overrides);
}
