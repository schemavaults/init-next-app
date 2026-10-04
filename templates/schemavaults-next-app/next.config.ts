import type { NextConfig } from "next";

const output: "standalone" | undefined = (
  typeof process.env.NEXT_STANDALONE_DOCKER_BUILD === "string" &&
  process.env.NEXT_STANDALONE_DOCKER_BUILD.includes("true")
) ? "standalone" : undefined;

const nextConfig: NextConfig = {
  output,
  experimental: {
    // Unmatched URLs render src/app/global-not-found.tsx
    globalNotFound: true,
  },
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
