const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' https://js.stripe.com 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://steam-express.onrender.com;
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
  images: {
    domains: ['upload.wikimedia.org'],
  },
  headers: async () => [
    {
      // ✅ 對所有 route 包含靜態資源生效
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

module.exports = nextConfig;
