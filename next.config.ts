import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blizzard.com',
      },
      {
        protocol: 'https',
        hostname: '**.blizzard.cn',
      },
      {
        protocol: 'https',
        hostname: '**.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: 'bnetcmsus-a.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: 'bnetcmsap-a.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: 'bnetcmeu-a.akamaihd.net',
      },
    ],
  },
  // Optimize package imports for better tree-shaking
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react'],
    // Serve stale page/segment cache data immediately during navigation
    // while revalidating in the background for faster page transitions
    staleTimes: {
      dynamic: 60,  // 60s stale time for dynamic pages (faster navigation)
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://*.sentry.io",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://*.blizzard.com https://*.blizzard.cn https://id.twitch.tv https://api.twitch.tv https://va.vercel-scripts.com https://*.sentry.io",
              "frame-ancestors 'none'",
              "form-action 'self'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
