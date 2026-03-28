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
    ];
  },
};

export default nextConfig;
