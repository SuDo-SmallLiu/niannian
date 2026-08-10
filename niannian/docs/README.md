# 念念年年 · 开发文档索引

> 更新：2026-08-10  
> 代码仓库：`github.com/SuDo-SmallLiu/niannian`  
> 生产域名：`niannian-years.top`

---

## 快速导航

| 文档 | 说明 |
|------|------|
| [系统架构](./ARCHITECTURE.md) | 技术栈、目录结构、核心模块、部署拓扑 |
| [数据库架构](./DATABASE.md) | 17 张表 ER 图、字段说明、数据流 |
| [开发历程](./DEVELOPMENT-HISTORY.md) | Sprint 里程碑、Git 提交时间线、当前状态 |
| [产品路线图](./plans/2026-08-06-current-roadmap.md) | Sprint 1–4 规划与完成度 |
| [**Word 全集**](./念念年年-开发文档全集.docx) | 上述文档合并的 `.docx`（可用 Word / WPS 打开） |

重新生成 Word：`python3 scripts/generate-dev-docs-docx.py`

---

## 历史规划文档（归档）

| 文档 | 日期 | 内容 |
|------|------|------|
| [MVP V1.1 开发计划](./plans/2026-08-06-mvp-v1.1-development-plan.md) | 2026-08-06 | Memory Card 中间层、四层标签、情动理论 |
| [Sprint 3 Life Story Engine](./plans/2026-08-06-mvp-v1.2-sprint3-life-story-engine.md) | 2026-08-06 | 故事引擎 V2、H5 播放器、版本管理 |
| [Auth 系统设计](./plans/2026-08-06-auth-system.md) | 2026-08-06 | 手机 OTP、JWT Cookie、家庭隔离 |
| [niannian-dev-docs.html](./niannian-dev-docs.html) | — | 早期 HTML 版开发文档（含部分 schema 片段） |

---

## 产品主线

```
Photo → Memory Card → Story → Life Movie
  │         │            │          │
上传照片   AI 解析+补充   主题聚类    多故事编排
         四层标签       H5 播放     MP4/H5 电影
```

**5 步用户路径（念念 Agent）：**

1. 上传照片  
2. AI 解析记忆卡  
3. 补充细节（可选）  
4. 生成家庭故事  
5. 生成人生电影 · 欣赏分享  

---

## 运行与部署

详见项目根目录 [README.md](../README.md) 部署章节。

| 组件 | 路径 / 命令 |
|------|-------------|
| 数据库 | `data/niannian.db`（SQLite WAL） |
| PM2 | `pm2 start node_modules/.bin/next --name niannian --cwd . -- start` |
| MeloTTS | `bash scripts/setup-melo-tts.sh` |
| 重渲染电影 | `MELO_PYTHON=services/narration/.venv/bin/python3 npx tsx scripts/rerender-movie.ts <movieId>` |
| Nginx | `deploy/nginx-production.conf` |

---

## 关键源码入口

| 领域 | 文件 |
|------|------|
| 数据库 | `src/lib/db.ts` |
| AI 照片解析 | `src/lib/ai.ts`、`src/lib/analyze-photo.ts` |
| 故事引擎 | `src/lib/story-engine/` |
| 电影引擎 | `src/lib/movie-engine/`、`src/lib/movie-render/` |
| 旁白 TTS | `src/lib/narration-tts.ts`、`services/narration/` |
| 念念 Agent | `src/lib/agent-steps.ts`、`src/components/GlobalNianNianAgent.tsx` |
| 认证 | `src/lib/auth.ts`、`src/middleware.ts` |
