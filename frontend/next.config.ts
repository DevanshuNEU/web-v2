import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Tell Next.js the monorepo root so file tracing works correctly on Vercel
  outputFileTracingRoot: path.join(__dirname, ".."),

  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize images for better performance
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },

  // Enable compression for faster load times
  compress: true,
  
  // Headers for security and caching optimization
  async headers() {
    return [
      {
        // Cache static assets aggressively
        source: '/:all*(svg|jpg|png|webp|avif|ico|css|js)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Baseline security headers for all routes
      // NOTE: Content-Security-Policy is intentionally deferred. A strict CSP
      // risks breaking framer-motion, PostHog analytics, inline JSON-LD, and
      // Next.js inline runtime; adding it the night before launch is too risky.
      // Revisit CSP post-launch with proper testing.
      {
        source: '/:path*',
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
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
