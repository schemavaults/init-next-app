import type { WordmarkProps } from "@schemavaults/ui";

/**
 * The app's own wordmark for `@schemavaults/ui` components that render a
 * <Wordmark /> (pass as `wordmarkProps` to <ErrorPage />), in place of the
 * default "SchemaVaults" in the SchemaVaults brand colours.
 *
 * The gradient is the theme's accent gradient, the one `DashboardLayout`
 * marks the active navigation item with, so it follows the deployment's
 * `THEME_*` variables: `THEME_LIGHT_SIDEBAR_ACTIVE_START` / `_END` (and the
 * `THEME_DARK_*` pair), or `THEME_*_BRAND_BLUE` / `_RED` while those are unset.
 */
const appWordmarkProps: WordmarkProps = {
  wordmarkText: "xxx_display_name_xxx",
  gradientColors: ["var(--sidebar-active-start)", "var(--sidebar-active-end)"],
};

export default appWordmarkProps;
