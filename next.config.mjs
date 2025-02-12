/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['upload.wikimedia.org'], //允許domain的圖片
  },
};


export default nextConfig;
