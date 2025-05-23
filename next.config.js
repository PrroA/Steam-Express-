/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; object-src 'none'; connect-src 'self' http://localhost:4000;"
      : "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; connect-src 'self';",
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'no-referrer',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
];

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'],
  },
  experimental: {
    optimizeCss: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
