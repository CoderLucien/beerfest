/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@beerfest/domain", "@beerfest/simulator"],
};

export default nextConfig;
