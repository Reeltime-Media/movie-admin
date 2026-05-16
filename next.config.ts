import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/catalog", destination: "/movie", permanent: true },
      { source: "/catalog/new", destination: "/movie/new", permanent: true },
    ];
  },
};

export default nextConfig;
