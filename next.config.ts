import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  devIndicators: {
    position: "bottom-right",
  },
  cacheLife: {
    fast: {
      stale: 60, // 1 min
      revalidate: 30, // 30 sec
      expire: 300, // 5 min
    },
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
    browserToTerminal: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  output: "standalone",
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  reactCompiler: true,
  typedRoutes: true,
  trailingSlash: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: "2mb",
    },
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    typedEnv: true,
  },
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(withNextIntl(nextConfig));
