/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Handle canvas for pdfkit
    config.resolve.alias.canvas = false;
    return config;
  },
}

module.exports = nextConfig
