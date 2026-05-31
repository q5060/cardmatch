import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["asia.pokemon-card.com", "cdn.pokemon-card.com", "pokemon-card.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.pokemon-card.com",
      },
    ],
  },
};

export default nextConfig;
