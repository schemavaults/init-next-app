export function tailwindConfigTemplate(): string {
  return `import { SchemaVaultsTailwindConfigFactory } from "@schemavaults/theme";

const config = new SchemaVaultsTailwindConfigFactory().createConfig({
  content: [
    "./src/**/*.{tsx,jsx,js,ts}",
    "@schemavaults/ui",
  ],
});

export default config;
`;
}
