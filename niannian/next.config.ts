import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 允许上传大文件 (最大 20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
