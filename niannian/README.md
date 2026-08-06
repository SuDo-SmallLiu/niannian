This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 部署（本项目：念念年年 / niannian）

> ⚠️ 本项目**不适合纯静态托管（如 Vercel / 纯静态导出）**：它使用 `better-sqlite3`（原生模块 + 本地文件数据库 `data/niannian.db`），必须在**支持 Node.js 运行时且有可写文件系统**的环境里运行。

### 运行前提
- Node.js 20+（含 `npm`）
- 能访问 GitHub 仓库（拉取代码）
- 运行时需要以下环境变量（本地开发放 `.env.local`，服务器放同级环境变量）：
  - `ARK_API_KEY`：火山引擎 Ark API Key（不填则进入演示模式，AI 返回模拟数据）
  - `ARK_BASE_URL` / `ARK_VISION_MODEL` / `ARK_TEXT_MODEL`：可选，有默认值
  - `DATABASE_PATH`：可选，默认 `./data/niannian.db`
- 上传目录 `public/uploads/` 与数据库 `data/` 需要可写权限

### 方式一：自有服务器（推荐）
1. 在服务器上 `git clone` 并 `npm ci --omit=dev`
2. 配置好上面的环境变量
3. 启动：`npm run build && npm run start`（建议用 `pm2` 守护进程）
4. 反向代理（Nginx 等）把 80/443 转到 `localhost:3000`

### 方式二：GitHub Actions 自动部署
仓库根目录已包含 `.github/workflows/deploy.yml`（**不是** `niannian/.github/` 下）：每次 push 到 `main` 会先跑 CI（build），通过后在本机 self-hosted runner 上部署。

**仓库结构说明：** git 根目录下的 Next.js 应用在 `niannian/` 子目录（`package.json` 所在位置）。

首次在服务器搭建环境，进入克隆后的 `niannian/` 子目录运行 `bash scripts/setup-server.sh`（Ubuntu/Debian）。

**内网服务器（当前方案）：** 服务器在 `10.x` 内网时，GitHub 云端无法 SSH 进来。需在本机注册 self-hosted runner，deploy job 会直接 `git pull + build + pm2 restart`：

```bash
# 1. 打开仓库 Settings → Actions → Runners → New self-hosted runner，复制 token
# 2. 以 clawdbot 运行：
RUNNER_TOKEN=你的token bash niannian/scripts/setup-github-runner.sh
```

**有公网 IP 的服务器（可选 SSH 部署）：** 运行 `bash niannian/scripts/setup-github-deploy.sh` 生成密钥，并在仓库 Secrets 配置 `SSH_HOST`、`SSH_USERNAME`、`SSH_KEY`、`DEPLOY_PATH`（需把 workflow deploy job 改回 SSH 方式）。
