import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow images from external sources used in the app
  images: {
    domains: ["images.pexels.com", "www.google.com"],
  },
};

export default nextConfig;
