import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // CI runs lint via `npm run lint`; skip duplicate build-time lint step.
    ignoreDuringBuilds: true
  }
};

export default nextConfig;
