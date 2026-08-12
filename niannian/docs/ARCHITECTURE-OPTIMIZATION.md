# 架构优化报告 · 实施说明

> 文档日期：2026-08-12  
> 策略：**模块化单体 + 持久化任务队列 + Provider 抽象**（渐进式，非全面微服务化）

---

## 执行结论

现阶段不全面微服务化。优先落地：

1. **持久化 Job 队列**（SQLite `jobs` / `job_events`）
2. **幂等控制**（`idempotency_key`、活跃任务去重）
3. **Web 与重任务解耦**（故事/照片/媒体生成异步化）
4. **版本化 Migration**（`schema_migrations` + 编号迁移）
5. **请求治理**（`x-request-id`、重 API 限流、分享鉴权）
6. **Provider 接口层**（为 AI/TTS/FFmpeg/存储替换做准备）

---

## 已落地模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 迁移系统 | `src/lib/migrations/` | v2 jobs、v3 photo_id、v4 幂等索引 |
| Job 仓储 | `src/lib/jobs/job-repository.ts` | 创建/claim/进度/完成/失败/心跳、FFmpeg 互斥 |
| Job 处理器 | `src/lib/jobs/job-processor.ts` | 故事/照片/媒体全类型 handler |
| 媒体 Job 执行 | `src/lib/jobs/media-jobs.service.ts` | TTS、音频方案、MP4 渲染 |
| 后台调度 | `src/instrumentation.ts` | 单进程模式 3s 轮询消费队列 |
| 独立 Worker | `scripts/job-worker.ts` | `npm run worker`，双进程时用 PM2 |
| Provider 类型 | `src/lib/providers/types.ts` | AI/TTS/STT/Media/Storage/Queue 接口 |
| 请求追踪 | `src/lib/request-context.ts` + `middleware.ts` | requestId/traceId |
| API 限流 | `src/lib/api-rate-limit.ts` + `heavy-api-guard.ts` | 重任务接口滑动窗口 |
| 统一 Jobs API | `/api/jobs`, `/api/jobs/[jobId]`, `/api/jobs/[jobId]/stream` | 查询 + SSE 进度 |
| 前端订阅 | `src/lib/poll-job.ts` | `watchJobUntilDone`（SSE → 轮询降级） |

---

## 数据库变更

### 新表

- **`schema_migrations`** — 迁移版本记录
- **`jobs`** — 持久化任务（status、payload、progress、idempotency_key、retry）
- **`job_events`** — 任务事件流（created/progress/completed/failed）
- **`media_assets`** — 媒体资产元数据（为对象存储迁移预留，**业务尚未写入**）

### 修正

- **`story_memory_cards.photo_id`** — 新增 canonical 列，回填 `memory_card_id` 值
- **`photos.content_hash`** — 可选，家庭内去重索引（**上传流程尚未使用**）

---

## 异步任务流

```
前端 POST → API 创建 Job（幂等）→ 返回 jobId (202)
                ↓
     instrumentation / niannian-worker 消费队列
                ↓
     更新 progress → 完成/失败写入 DB
                ↓
     前端 SSE /api/jobs/:id/stream（失败降级轮询）
```

### 已异步化

| 接口 | Job Type |
|------|----------|
| `POST /api/story/generate` | `story_generate` |
| `POST /api/story/regenerate` | `story_regenerate` |
| `POST /api/story/compose` | `story_compose` |
| `POST /api/analyze` | `photo_analysis` |
| `POST /api/analyze/photo` | `photo_analyze_single` |
| `POST /api/speech/synthesize` | `speech_synthesize`（缓存命中同步返回） |
| `POST /api/movie/render` preparePlanOnly | `movie_audio_plan` |
| `POST /api/movie/render` 渲染 | `movie_render` |
| `POST /api/movie/generate` | `movie_generate` |

### 仍同步（P3 候选）

| 接口 | 说明 |
|------|------|
| `POST /api/memory-card/questions` | 同步 AI，已限流 |
| `POST /api/speech/transcribe` | 同步 STT，已鉴权 + 限流 |
| `POST /api/movie/prefetch-narration` | 内存 prefetch，已鉴权 + 限流 |

---

## 运维

### 单进程（默认）

```bash
npm run build && pm2 restart niannian
```

### 双进程（Web + Worker 分离）

```bash
NIANNIAN_DUAL_PROCESS=1 pm2 start ecosystem.config.cjs
```

- Web：`NIANNIAN_DISABLE_JOB_WORKER=1`
- Worker：`npm run worker`

---

## 待优化（P3+）

| 优先级 | 项 |
|--------|-----|
| P3 | `memory-card/questions` Job 化 |
| P3 | Provider 层接入 Job 执行器 |
| P3 | `media_assets` + `content_hash` 落地 |
| P4 | PostgreSQL / Redis / OSS 迁移 |

---

## 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATABASE.md](./DATABASE.md)
