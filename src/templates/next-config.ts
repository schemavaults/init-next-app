export function nextConfigTemplate(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
`;
}

export default nextConfigTemplate;
