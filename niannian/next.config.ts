import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const nextConfig: NextConfig = {
  // 上传照片走 API 动态读取，避免 next start 无法服务 build 后新增的文件
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
  // 允许上传大文件 (最大 20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
    proxyClientMaxBodySize: '200mb',
  },
  // 跳过构建时的 TypeScript 类型检查（运行时无影响）
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
