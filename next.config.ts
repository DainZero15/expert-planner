import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // PDF.js is server-only and must not be bundled into client page chunks.
  serverExternalPackages: ["pdf-parse"],
};
export default nextConfig;
