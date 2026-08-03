import type { NextConfig } from "next";

const testDistDir = process.env.NEXT_TEST_DIST_DIR;
if (testDistDir && !/^\.next-test-[A-Za-z0-9_-]+$/u.test(testDistDir)) {
  throw new Error('NEXT_TEST_DIST_DIR inválido.');
}

const nextConfig: NextConfig = {
  ...(testDistDir ? { distDir: testDistDir } : {}),
  experimental: {
    serverActions: {
      bodySizeLimit: '256kb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
