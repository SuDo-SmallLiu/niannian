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
      // build 后 runtime 生成的旁白 WAV / 渲染 MP4 需走 API 动态读取
      {
        source: '/audio/narration/:path*',
        destination: '/api/audio/narration/:path*',
      },
      {
        source: '/video/movies/:path*',
        destination: '/api/video/movies/:path*',
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
};

export default nextConfig;
