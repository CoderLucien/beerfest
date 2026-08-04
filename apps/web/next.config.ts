import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@beerfest/domain", "@beerfest/simulator"],
};

export default nextConfig;
