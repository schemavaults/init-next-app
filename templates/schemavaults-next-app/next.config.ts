import type { NextConfig } from "next";

const output: "standalone" | undefined = (
  typeof process.env.NEXT_STANDALONE_DOCKER_BUILD === "string" &&
  process.env.NEXT_STANDALONE_DOCKER_BUILD.includes("true")
) ? "standalone" : undefined;

const nextConfig: NextConfig = {
  output,
  turbopack: {
    root: __dirname
  }
};

export default nextConfig;
