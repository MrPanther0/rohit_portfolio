/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Remote patterns are derived from the API origin so uploads render without extra config. */
function remotePatterns() {
  const patterns = [
    { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
  ];
  try {
    const url = new URL(apiUrl);
    patterns.push({
      protocol: url.protocol.replace(':', ''),
      hostname: url.hostname,
      port: url.port || '',
      pathname: '/static/**',
    });
  } catch {
    /* fall back to Cloudinary only */
  }
  return patterns;
}

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: remotePatterns(),
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560, 3440],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@tanstack/react-query'],
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
