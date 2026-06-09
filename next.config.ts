import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  devIndicators: {
    position: 'bottom-right',
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
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  output: 'standalone',
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  images: {
    // Node.js uses its own CA bundle (not the Windows cert store), so in dev
    // environments with SSL-inspection proxies the server-side fetch inside
    // /_next/image fails.  Disabling optimization in dev makes the <Image>
    // component emit a plain <img> that the browser fetches directly — no
    // Node.js TLS involved.
    unoptimized: process.env.NODE_ENV !== 'production',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.gstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
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
      bodySizeLimit: '2mb',
    },
    turbopackFileSystemCacheForDev: true,
    turbopackFileSystemCacheForBuild: true,
    typedEnv: true,
  },
};

const baseConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(withNextIntl(nextConfig));

export default withSentryConfig(baseConfig, {
  org: 'iroko',
  project: 'javascript-nextjs',

  // Silencia output de Sentry en local; en CI sí muestra (para detectar errores de upload)
  silent: process.env.CI !== 'true',

  // Sube más source maps para mejor stack traces en el cliente
  widenClientFileUpload: true,

  // Quita el logger de Sentry del bundle de cliente (~3.5KB)
  disableLogger: true,

  // Monitoreo automático de cron jobs en Vercel
  automaticVercelMonitors: true,
});
