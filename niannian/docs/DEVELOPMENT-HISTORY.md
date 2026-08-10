# 念念年年 · 开发历程

> 整理至 2026-08-10 · 基于 Git 历史与规划文档

---

## 阶段总览

| 阶段 | 时间 | 主题 | 状态 |
|------|------|------|------|
| Demo | 2026-08 初 | 照片上传 + 简单故事 | ✅ 完成 |
| MVP V1.1 | 2026-08-06 | Memory Card 中间层、四层标签 | ✅ 完成 |
| Sprint 3 | 2026-08-06~07 | Life Story Engine + H5 播放器 | ✅ 核心完成 |
| Sprint 4 | 2026-08-07~09 | Life Movie Engine + MP4 渲染 | ✅ MVP 完成 |
| MVP V3 | 2026-08-09 | 念念 Agent、批解析、MeloTTS | ✅ 完成 |
| Auth | 2026-08-09 | 手机 OTP、家庭隔离 | ✅ 完成 |
| 生产化 | 2026-08-09~10 | FFmpeg 管线、UI 打磨、旁白修复 | 🟡 进行中 |

---

## Sprint 交付清单

### Sprint 1 · 照片理解 · Memory Card ✅

- [x] 照片上传中心（`/family/[id]/upload`）
- [x] AI 照片解析（火山 Ark Vision）
- [x] Memory Card 数据结构（事实 / 理解 / 叙事层）
- [x] 四层标签系统（`tags.layer` 1–4）
- [x] 情动理论字段（`understanding` JSON）

### Sprint 2 · 用户补充 · 筛选 ✅

- [x] 记忆卡补充页（微信式对话 + 语音 STT）
- [x] AI 追问生成（`ai_questions`）
- [x] 全局记忆搜索（`global_memory_search`）
- [x] 时间 / 人物 / 地点筛选

### Sprint 3 · Life Story Engine + H5 ✅

- [x] `story-engine/` 聚类 → 主题 → 撰写 → 封面
- [x] `story_memory_cards`、`story_versions` 表
- [x] `InteractiveStoryPlayer` 全屏 H5 播放器
- [x] `/stories/[id]/play` 路由
- [x] 人工组合故事（`/family/[id]/story/compose`）
- [x] 故事分享海报
- [ ] 四种重新生成模式 UI（后端已有 `story_versions`）
- [ ] 故事编辑（标题 / 排序 / 删图）

### Sprint 4 · Life Movie Engine ✅

- [x] `life_movies`、`movie_chapters` 表
- [x] `movie-engine/` 多 Story 编排
- [x] H5 多章节播放（`/movies/[id]/play`）
- [x] FFmpeg MP4 渲染管线（1080×1920 Ken Burns）
- [x] MeloTTS 中文旁白 + BGM 混音
- [x] MP4 / H5 双模式播放
- [x] 电影分享
- [ ] Supabase 迁移（远期）

### Auth 系统 ✅（原规划 Sprint 4 后）

- [x] 手机 OTP 登录（`users`、`verify_codes`）
- [x] Session Cookie 认证
- [x] 家庭邀请码（`invitations`）
- [x] 用户级家庭隔离（`family_users`）
- [x] 首页登录门控

### MVP V3 · 念念 Agent ✅

- [x] 全局念念浮层 + 5 步引导（`GlobalNianNianAgent`）
- [x] 念念帮助台（`NianNianHelpDesk`）
- [x] 批量照片解析 + 进度轮询
- [x] 解析完成后自动触发故事生成
- [x] MeloTTS 旁白引擎集成
- [x] 主题 BGM + 旁白 ducking

### 生产化与 UI 打磨 🟡

- [x] 首页 UI 重设计（奶油纸张背景、透明 Logo）
- [x] 自托管中文字体（`next/font`）
- [x] 统一二级页面壳（`PageShell` / `PageHero`）
- [x] 删除确认对话框统一
- [x] 解析轮询竞态修复（job TTL + DB fallback）
- [x] MeloTTS 重装 + 旁白重渲染脚本
- [x] 念念浮层 z-index 置顶
- [ ] 批量重渲染历史无旁白电影
- [ ] H5 分享独立播放链接

---

## Git 提交时间线（main 分支）

### 2026-08-06 · 基础能力

| Commit | 说明 |
|--------|------|
| `aa0814a` | Life Story Engine MVP（Sprint 3 启动） |
| `fbae715` | 统一分享海报布局 |
| `9f51a8b` | shadcn 适老对话框 + 无障碍聊天 |
| `7a90918` | 服务端 STT 语音输入 |
| `1de84e6` | 修复上传后照片不显示 |

### 2026-08-07 · 故事与电影

| Commit | 说明 |
|--------|------|
| `65aed05` | H5 故事播放器 + Life Movie Engine（Sprint 3–4） |
| `13fc018` | 故事/记忆卡删除 + H5 自动播放修复 |
| `de703e3` | 主题 BGM + 电影分享 |

### 2026-08-08 · 搜索与旁白

| Commit | 说明 |
|--------|------|
| `2e5f465` | 全局记忆搜索 + 异步故事任务 + 电影旁白 |
| `85620f2` | 修复生产 CSS（Tailwind 依赖） |

### 2026-08-09 · MVP V3 + Auth + FFmpeg

| Commit | 说明 |
|--------|------|
| `62a4cca` | **MVP V3**：念念 Agent、批解析、MeloTTS |
| `18b8f80` | 解析完成后自动故事生成 |
| `a320c00` | 微信式补充对话 + 去英文 UI |
| `4e98b0c` | 手机 OTP 登录 + 首页门控 |
| `30c2371` | 用户级家庭隔离 |
| `59f3fd0` | 记忆筛选（时间/人物/地点） |
| `75cc528` | 故事生成 UX + 沉浸式 BGM |
| `6b77b00` | **FFmpeg 电影管线** + 旁白服务 + Agent 步骤 |
| `3607c71` | MP4 渲染超时修复 + 播放入场优化 |
| `4ce4360` | 修复 Nginx 413 上传限制 |

### 2026-08-10 · UI 打磨 + 稳定性

| Commit | 说明 |
|--------|------|
| `08e9038`~`0357b03` | 首页 UI 重设计 |
| `98a82b5`~`f1ef1f0` | 品牌 Logo、Profile 页、影院暗色模式 |
| `edc4386` | 解析轮询修复、旁白播放、念念浮层、移动端优化 |

---

## 关键技术决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-08-06 | Memory Card 作为中间层 | 从「照片驱动」升级为「记忆驱动」 |
| 2026-08-06 | SQLite 而非 Supabase | 单机部署简单，内网服务器 |
| 2026-08-07 | H5 播放器而非 PDF/长文 | 老人友好，沉浸式体验 |
| 2026-08-09 | MeloTTS 而非云端 TTS | 离线可控、中文质量、MIT 协议 |
| 2026-08-09 | FFmpeg 预渲染 MP4 | 移动端播放稳定，旁白+BGM 一次混音 |
| 2026-08-09 | 手机 OTP 而非微信 OAuth | 内网部署，无需第三方 OAuth |
| 2026-08-10 | 解析 Job TTL 不立即清除 | 修复双轮询竞态导致 UI 卡死 |

---

## 已知问题与待办

| 优先级 | 事项 | 说明 |
|--------|------|------|
| P1 | 历史电影旁白批量重渲染 | MeloTTS 故障期间生成的 MP4 无旁白 |
| P1 | MeloTTS 健康监控 | 防止 `/tmp/MeloTTS` 丢失导致无声 |
| P2 | 故事四种重生 UI | `story_versions` 已有，缺前端 |
| P2 | H5 分享独立链接 | 家人免登录观看 |
| P3 | Supabase 迁移 | 多实例 / 云部署时需要 |

---

## 团队与工具

| 角色 | 工具 |
|------|------|
| 产品 / 工程 | cker |
| AI 辅助开发 | Cursor Agent |
| 代码托管 | GitHub `SuDo-SmallLiu/niannian` |
| 生产部署 | PM2 + Nginx + cron 自动部署 |
