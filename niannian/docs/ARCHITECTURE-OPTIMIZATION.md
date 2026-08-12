# 架构优化报告 · 实施说明

> 文档日期：2026-08-12  
> 策略：**模块化单体 + 持久化任务队列 + Provider 抽象**（渐进式，非全面微服务化）

---

## 执行结论

现阶段不全面微服务化。优先落地：

1. **持久化 Job 队列**（SQLite `jobs` / `job_events`）
2. **幂等控制**（`idempotency_key`、活跃任务去重）
3. **Web 与重任务解耦**（故事生成/重新生成异步化）
4. **版本化 Migration**（`schema_migrations` + 编号迁移）
5. **请求治理**（`x-request-id`、重 API 限流）
6. **Provider 接口层**（为 AI/TTS/FFmpeg/存储替换做准备）

---

## 已落地模块

| 模块 | 路径 | 说明 |
|------|------|------|
| 迁移系统 | `src/lib/migrations/` | v2 jobs、v3 photo_id、v4 幂等索引 |
| Job 仓储 | `src/lib/jobs/job-repository.ts` | 创建/claim/进度/完成/失败/心跳 |
| Job 处理器 | `src/lib/jobs/job-processor.ts` | story_generate、story_regenerate |
| 后台调度 | `src/instrumentation.ts` | 服务端 3s 轮询消费队列 |
| Provider 类型 | `src/lib/providers/types.ts` | AI/TTS/STT/Media/Storage/Queue 接口 |
| 请求追踪 | `src/lib/request-context.ts` + `middleware.ts` | requestId/traceId |
| API 限流 | `src/lib/api-rate-limit.ts` | 重任务接口滑动窗口 |
| 统一 Jobs API | `/api/jobs`, `/api/jobs/[jobId]` | 创建与查询 |
| 前端轮询 | `src/lib/poll-job.ts` | regenerate 异步完成后刷新 |

---

## 数据库变更

### 新表

- **`schema_migrations`** — 迁移版本记录
- **`jobs`** — 持久化任务（status、payload、progress、idempotency_key、retry）
- **`job_events`** — 任务事件流（created/progress/completed/failed）
- **`media_assets`** — 媒体资产元数据（为对象存储迁移预留）

### 修正

- **`story_memory_cards.photo_id`** — 新增 canonical 列，回填 `memory_card_id` 值
- **`photos.content_hash`** — 可选，家庭内去重索引

### SQLite 调优

- `busy_timeout = 5000`
- 禁止在 DB 事务内调用 AI/TTS/FFmpeg（Job Worker 异步执行）

---

## 异步任务流

```
前端 POST → API 创建 Job（幂等）→ 返回 jobId
                ↓
     instrumentation / worker 消费队列
                ↓
     更新 progress → 完成/失败写入 DB
                ↓
     前端 GET /api/jobs/:id 轮询（SSE 后续迭代）
```

### 已异步化

| 接口 | Job Type |
|------|----------|
| `POST /api/story/generate` | `story_generate` |
| `POST /api/story/regenerate` | `story_regenerate` |

### 待异步化（下一阶段）

- `POST /api/story/compose`
- `POST /api/analyze/photo`、`/api/analyze/retry`
- `POST /api/speech/synthesize`
- `POST /api/movie/render`（preparePlanOnly）

---

## 目标架构（演进路线）

```
浏览器 → Nginx → Next.js Web × N（无状态）
                    ├─ PostgreSQL（业务 + jobs）
                    ├─ Redis（限流/锁/缓存）
                    ├─ 对象存储（媒体）
                    └─ Job Queue
                         ├─ AI Worker
                         ├─ TTS Worker
                         └─ FFmpeg Worker
```

当前阶段仍使用 **SQLite + 本地 FS + 进程内 Worker**，接口与表结构已为迁移 PostgreSQL/Redis/OSS 预留。

---

## 运维

- 禁用进程内 Worker：`NIANNIAN_DISABLE_JOB_WORKER=1`
- 多实例 PM2 时建议独立 Worker 进程消费同一 `jobs` 表（需 PostgreSQL 或 SQLite 单写者）
-  stale 任务：`recoverStaleJobs(30)` 自动 requeue 或 fail

---

## 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 现有系统架构
- [DATABASE.md](./DATABASE.md) — 数据模型
