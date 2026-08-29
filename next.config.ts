import type { NextConfig } from "next";

// Use 127.0.0.1 instead of localhost so Next.js rewrites hit Docker on IPv4 (avoids ::1 ECONNREFUSED on macOS).
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "")?.replace(
  "://localhost",
  "://127.0.0.1",
);

const nextConfig: NextConfig = {
  async headers() {
    // Skip custom Cache-Control in dev — Next already no-caches, and pinning
    // /_next/static (even briefly) caused stale JS vs SSR hydration mismatches.
    if (process.env.NODE_ENV !== "production") {
      return [];
    }

    return [
      {
        // Build-hashed — safe to cache forever.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // /public media — filenames aren't hashed, so keep a shorter cache with revalidation.
        source: "/:path*.(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2|ttf|mp4|webm)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
    ];
  },
  async rewrites() {
    if (!apiProxyTarget) return [];
    return [{ source: "/api-proxy/:path*", destination: `${apiProxyTarget}/:path*` }];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.reeltime.fun",
      },
      {
        protocol: "https",
        hostname: "pub-54c6a20fcd354e4d885b4ce83457064a.r2.dev",
      },
      {
        protocol: "https",
        hostname: "pub-25935d9298c34f1486e55539f8d5bec4.r2.dev",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/catalog", destination: "/movie", permanent: true },
      { source: "/catalog/new", destination: "/movie/new", permanent: true },
    ];
  },
};

export default nextConfig;
