import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it as an external CommonJS require
  // instead of trying to bundle it.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
