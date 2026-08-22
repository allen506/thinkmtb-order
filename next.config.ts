import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [],
    localPatterns: [
      { pathname: "/final-designs/**" },
      { pathname: "/designs/**" },
    ],
  },
};

export default nextConfig;
