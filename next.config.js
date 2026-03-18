/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === 'development';

const ContentSecurityPolicy = isDev
  ? `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    connect-src 'self' http://localhost:4000 https://steam-express.onrender.com https://api.stripe.com https://m.stripe.network https://r.stripe.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    font-src 'self' data:;
    object-src 'none';
  `
  : `
    default-src 'self';
    script-src 'self' https://js.stripe.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https:;
    connect-src 'self' https://steam-express.onrender.com https://api.stripe.com https://m.stripe.network https://r.stripe.com;
    frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
    font-src 'self' data:;
    object-src 'none';
  `;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
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
  output: 'standalone',
  images: {
    domains: ['upload.wikimedia.org', 'steam-express.onrender.com'],
    remotePatterns: [
      { protocol: 'https', hostname: 'steam-express.onrender.com' },
      { protocol: 'http', hostname: 'localhost', port: '4000' },
    ],
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
