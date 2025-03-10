/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'],
  },
  experimental: {
    optimizeCss: true, // ✅ 優化 CSS 載入
  },
};

module.exports = nextConfig;
