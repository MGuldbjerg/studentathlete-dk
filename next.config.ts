import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Krævet for Cloudflare Workers
  },
};

export default nextConfig;
