import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.8'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        port: '',
        pathname: '/football/teams/**',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        port: '',
        pathname: '/football/leagues/**',
      },
      {
        protocol: 'https',
        hostname: 'media.api-sports.io',
        port: '',
        pathname: '/football/players/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5050',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: '192.168.1.8',
        port: '5050',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
