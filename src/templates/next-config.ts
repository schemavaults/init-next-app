export function nextConfigTemplate(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
`;
}

export default nextConfigTemplate;
