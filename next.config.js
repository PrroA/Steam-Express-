/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'], //允許 domain 的圖片
  },
};

module.exports = nextConfig;
