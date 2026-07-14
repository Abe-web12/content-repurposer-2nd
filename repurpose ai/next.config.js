const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingRoot: process.cwd(),
};
module.exports = nextConfig;
