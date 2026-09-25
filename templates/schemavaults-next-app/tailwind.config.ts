import { SchemaVaultsTailwindConfigFactory } from "@schemavaults/theme";

const config = new SchemaVaultsTailwindConfigFactory().createConfig({
  content: [
    "./src/**/*.{tsx,jsx,js,ts}",
    "@schemavaults/ui",
    "@schemavaults/openapi-docs-ui",
  ],
});

export default config;
