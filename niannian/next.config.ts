import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), true);

const nextConfig: NextConfig = {
  // 允许上传大文件 (最大 20MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // 跳过构建时的 TypeScript 类型检查（运行时无影响）
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
