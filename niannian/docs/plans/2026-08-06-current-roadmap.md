# 念念年年 · 开发计划（2026-08-06 更新）

> 执行：cker + Cursor  
> 主线：`Photo → Memory Card → Scene → Story → Chapter → Life Movie`

---

## 当前阶段总览

| Sprint | 名称 | 状态 | 说明 |
|--------|------|------|------|
| 1 | 照片理解 · Memory Card | ✅ 完成 | |
| 2 | 用户补充 · 筛选 | ✅ 完成 | 含服务端 STT 语音 |
| **3** | **Life Story Engine + H5 故事** | **🟡 ~85%** | **核心：动态交互 H5** |
| **4** | **Life Movie Engine** | **🟡 MVP 完成** | **多 Story → 人生电影 H5** |
| Auth | 登录 · 邀请 | 📋 规划中 | Sprint 4 稳定后 |

---

## Sprint 3 · Life Story Engine + 动态 H5 故事

### 目标
~20 张照片 → 3–5 个主题 Story → **全屏沉浸式 H5 交互播放**（非静态长文）

### ✅ 已完成

| 模块 | 交付 |
|------|------|
| 3.1 数据结构 | `story_layer`、`story_memory_cards`、`story_versions` |
| 3.2 Story Engine | `lib/story-engine/` cluster → theme → compose → cover |
| 3.3 生成入口 | `POST /api/story/generate`、家庭页「发现故事」 |
| 3.4 故事详情 | `/stories/[id]` 章节时间轴 |
| **3.4 H5 播放器** | **`InteractiveStoryPlayer` 全屏幻灯片** |
| **H5 路由** | **`/stories/[id]/play`** |
| 人工组合 | `/family/[id]/story/compose` + AI 提示 |
| 分享 | 统一海报、微信保存 |
| UX | shadcn 适老对话框、语音 STT、上传动态服务 |

### H5 故事交互规格（已实现）

- 全屏沉浸式（类 Instagram Stories / 纪录片 H5）
- 封面 → 章节幻灯（Ken Burns 照片动画 + 叙述文字渐入）→ 结尾
- **左滑 / 右滑 / 点击左右区域** 切换
- **自动播放**（默认 7 秒/页，适合老人欣赏）
- 顶部进度条、暂停/继续

### 🟡 Sprint 3 剩余

- [ ] 故事编辑（标题 / 摘要 / 删图 / 排序）
- [ ] 四种重新生成模式 + 版本恢复 UI
- [ ] 故事库 V2 卡片（封面 / 主题标签）
- [ ] 生成故事异步进度（20 张耗时长）
- [ ] 上传分片（5 张/批）
- [ ] H5 分享独立链接（`/share/story/[id]/play`）

---

## Sprint 4 · Life Movie Engine

### 目标
多个 Story 编排为 **Chapter** → 一部可播放的 **人生电影 H5**

```
Story × N → movie_chapters → Life Movie → /movies/[id]/play
```

### ✅ MVP 已完成

| 模块 | 交付 |
|------|------|
| 4.1 数据结构 | `life_movies`、`movie_chapters` 表 |
| 4.2 Movie Engine | `lib/movie-engine/` 按主题排序串联 Story |
| 4.3 API | `POST /api/movie/generate`、`GET /api/movie` |
| 4.4 播放页 | `/movies/[id]/play` 复用 H5 播放器 + 章节过渡页 |
| 4.5 入口 | 底部导航「电影」、家庭页「生成人生电影」 |

### 🟡 Sprint 4 增强（后续）

- [ ] 人生电影封面自动生成（多 Story 拼图）
- [ ] 欣赏模式（超大字号 + 纯自动播放，零操作）
- [ ] 电影分享链接 / 海报
- [ ] AI 章节过渡文案（interstitial 幻灯）
- [ ] Supabase 迁移（V1.1 原计划）

---

## 用户路径（当前可用）

```
上传照片 → AI 解析 → 补充记忆
    ↓
发现故事（3–5 个 Story）
    ↓
故事库 → ▶ 沉浸体验（H5 单故事）
    ↓
生成人生电影 → 🎬 电影页播放（H5 多章节）
    ↓
分享海报 / 微信
```

---

## 建议下一步

1. **H5 分享链接** — 家人无需登录即可 `/play` 观看  
2. **欣赏模式** — 老人端：打开即自动播、无按钮  
3. **Sprint 3 收尾** — 四种重生 + 故事编辑  
4. **Auth 系统** — 多用户家庭空间  

---

*更新：2026-08-06 晚 · Sprint 3 H5 + Sprint 4 Movie MVP*
