# 念念 · 落地开发计划（具体版 v3）

> 基于 2026-08-15 梳理稿 · 对照当前代码 `main`  
> **v3 新增：** 首页 Agent 化改造 + 念念智能体对话（补充记忆卡引导式聊天）  
> 每个任务写明：**改哪个文件、页面长什么样、验收标准**

---

## 一、现在有什么 vs 缺什么

```
【已有，能跑通】
首页 /                    → HomeWelcomeHero + 我要创造 | 我要欣赏（两卡片）
/appreciate               → 三个入口卡片（照片/故事/电影）
/family/{id}/upload       → 选文件上传 → /analyze → /photos
/family/{id}/photos       → 记忆卡网格 + 去生成故事
/family/{id}/story        → 草稿箱（未发布故事）
/stories                  → 已发布故事库
/movies/{id}/play         → H5 + MP4 播放
GlobalNianNianAgent       → 右下角浮层 → NianNianHelpDesk（5 步管道，点按）
UserSupplementPanel       → 照片详情内聊天式补充（AccessibleChatPanel + 语音 STT）

【缺，UI 稿 + 梳理稿要求】
❌ 首页 Agent 化：无个性化问候、无快捷动作网格、无「最近上传」、无底部对话输入框
❌ 念念智能体对话：补充记忆卡未做成独立全屏聊天页；无完成度进度条；无「问题 1/5」编号气泡
❌ 首页对话 → 导航：输入「帮我上传照片」无法路由到对应页面
❌ 欣赏模式：听故事=大图少字（现在有播放但字还偏多）
❌ 欣赏模式：看照片=上方记忆卡+下方时间轴（现在是普通网格）
❌ 上传：步骤多（首页→选家庭→upload→选文件，至少 4 步）
❌ 记忆卡：一眼看不出情绪（只有完成度条）
❌ 批量补充：只能逐张进详情页补充
❌ 自动生成故事：没有 A/B/C 选版
❌ 图片数量：没有 1–9 张限制
❌ 念念语音：「念念，我要看电影」等指令 — 完全没做
❌ OCR 扫老照片：没做
❌ 电影静态版字幕：字在底部固定区，不是每张图合适位置
```

### UI 稿对照（2026-08-17 高保真）

| 稿面 | 关键元素 | 与现有代码差距 |
|------|----------|----------------|
| **首页 Agent 化** | 问候语、3D 念念头像持相机、2×2 快捷卡片、最近上传横滑、底部建议 chips + 输入框 + 麦克风 | `page.tsx` 只有 Hero + 2 卡片，无聊天区 |
| **补充记忆卡对话** | 顶栏「补充记忆卡 · 引导式提问」、完成度 60%、照片缩略图首条、问题 1/5…、黄/蓝气泡 | `UserSupplementPanel` 在详情页内嵌，无顶栏进度、无编号 |

---

## 二、Phase 0（第 0–2 周）首页改造 + 念念智能体对话

> **优先级最高** — 用户打开 App 的第一屏即 Agent 体验，与梳理稿「念念陪伴」定位一致。

### 任务 0.1：首页 Agent 化布局（对照 UI 稿 · 首页）

**用户看到的变化**

| 现在 | 改后 |
|------|------|
| 品牌 Banner + 左右气泡 + 念念头像 | 顶部：用户头像（左）+ 「Try premium」占位（右） |
| 只有「我要创造 / 我要欣赏」两卡片 | **保留双模式**，但改为顶栏 Tab 或 Hero 下方切换，不占满屏 |
| 无快捷入口 | **2×2 动作网格**（见下表） |
| 无最近内容 | **「最近上传」** 横滑缩略图（4–8 张，点进详情） |
| 无对话区 | 底部固定：**建议 chips** + 输入框 + `+` 附件 + 麦克风 + 发送 |

**动作网格 → 现有路由映射**

| UI 文案 | 图标 | 跳转 / 行为 |
|---------|------|-------------|
| 上传照片 | 文件夹↑ | `router.push(/family/{lastFamilyId}/upload)` |
| 智能识别 | ✨ | 上传完成后 `/analyze`，或进 `/family/{id}/photos?filter=analyzing` |
| 美化处理 | 魔杖 | **v1 占位**：toast「即将推出」或链到 analyze 结果页 |
| 生成描述 | 文档 | 进待补充记忆卡列表 `?filter=needs_supplement` |

**Hero 问候语**

```
Hello {displayName}，👋 我是念念。
我可以帮你上传照片并处理，你想做些什么呢？
```

- `displayName` 来自 session / `/api/user`；未登录显示「朋友」

**要改 / 新建的文件**

| 文件 | 改什么 |
|------|--------|
| `src/app/page.tsx` | 重组布局：登录态用新 `HomeAgentPage`；未登录保持现有 landing |
| **新建** `src/components/home/HomeAgentPage.tsx` | 整页容器：Header、Hero、ModeTabs、ActionGrid、RecentUploads、ChatComposer |
| **新建** `src/components/home/HomeAgentHeader.tsx` | 头像 + Premium 占位按钮 |
| **新建** `src/components/home/HomeAgentHero.tsx` | 问候语 + `NianNianAvatar variant="hero"` 持相机样式 |
| **新建** `src/components/home/HomeActionGrid.tsx` | 2×2 卡片，复用 `HomeFeatureCards` 的 card 样式 token |
| **新建** `src/components/home/HomeRecentUploads.tsx` | `GET /api/photos?limit=8&sort=created_at` 横滑 |
| **新建** `src/components/home/HomeChatComposer.tsx` | chips + input + mic + send；见任务 0.3 |
| `src/components/HomeWelcomeHero.tsx` | 保留给未登录 / 紧凑模式；登录首页不再直接用 |
| `src/components/HomeFeatureCards.tsx` | 创造/欣赏逻辑抽到 `HomeModeTabs.tsx` |
| **新建** `src/app/globals.css` 或 `home-agent.css` | `.home-agent-*` 间距、安全区、底部 composer 固定 |

**验收**

1. 登录用户打开 `/`，3 秒内看到问候语、念念头像、4 快捷卡片、最近上传、底部输入框  
2. 点「上传照片」≤2 次点击到 upload 页（有 lastFamilyId 时）  
3. 创造 / 欣赏模式可切换，欣赏仍进 `/appreciate`

---

### 任务 0.2：补充记忆卡 · 引导式对话页（对照 UI 稿 · 聊天）

**用户看到的变化**

```
┌─────────────────────────────────┐
│  [念念头像]  补充记忆卡 · 引导式提问    │
│  记忆卡完成度  ████████░░  60%        │
├─────────────────────────────────┤
│  🟡 我已分析你上传的照片… [缩略图]     │
│  🟡 问题 1/5：照片主体是什么？         │
│  🔵 我的狗                           ✓ │
│  🟡 问题 2/5：它叫什么名字？           │
│  🔵 奶茶                             ✓ │
│  🟡 问题 3/5：大概什么时候拍的？       │
├─────────────────────────────────┤
│  [+]  点击输入你的回答…  🎙  [发送]    │
└─────────────────────────────────┘
```

**与 `UserSupplementPanel` 的关系**

- **逻辑复用**：`buildQuestionQueue`、`buildThreadFromState`、`submitReply`、`useVoiceInput`、保存 API  
- **UI 新建**：全屏页 + 顶栏进度 + 编号问题 + 黄/蓝气泡样式 + 照片首条消息  
- 照片详情页保留「快速补充」入口，点击 **「和念念聊聊」** → 跳转本页

**问题队列（5 题，对齐 UI 稿）**

| # | 来源 | 内容 |
|---|------|------|
| 1 | 固定 | 这张照片的主体是什么？（宠物、风景、人物、活动…） |
| 2 | 固定 | 主体有名字吗？叫什么？（便于准确记住） |
| 3 | 固定 | 大概什么时候拍的？（年月日或「某年夏天」） |
| 4 | AI | `/api/memory-card/questions` 返回的第 1 条 |
| 5 | AI | 返回的第 2 条（不足则跳过，完成度按已答/总题数算） |

- 更新 `src/lib/supplement-questions.ts`：`FIXED_SUPPLEMENT_QUESTIONS` 改为上述 3 条（原 3 条「时间/地点/人物」合并进 AI 题或第 4–5 题）

**要改 / 新建的文件**

| 文件 | 改什么 |
|------|--------|
| **新建** `src/app/photos/[id]/supplement/page.tsx` | 全屏补充对话路由 |
| **新建** `src/components/niannian/NianNianSupplementChat.tsx` | 顶栏 + 进度条 + 聊天区 + composer |
| **新建** `src/components/niannian/SupplementProgressHeader.tsx` | 「记忆卡完成度」+ `MemoryCardCompletionBar` |
| **新建** `src/components/niannian/SupplementChatBubble.tsx` | 黄（assistant）/ 蓝（user）+ 已读 ✓ + `问题 n/5` 前缀 |
| **新建** `src/components/niannian/SupplementPhotoIntro.tsx` | 首条 AI 消息 + 缩略图 + 「基于 1 张照片解析」 |
| `src/components/UserSupplementPanel.tsx` | 抽离 hook：`useSupplementChat(photoId)`；详情页用精简版或链到全屏页 |
| **新建** `src/hooks/useSupplementChat.ts` | 共享 state：queue、thread、progress、save、reanalyze |
| `src/lib/supplement-questions.ts` | 新固定 3 题 + `TOTAL_SUPPLEMENT_STEPS = 5` |
| `src/lib/memory-card-completion.ts` | 导出 `getCompletionPercent(photo)` 供顶栏 |
| `src/app/family/[id]/photos/[photoId]/page.tsx` | 加 CTA「和念念聊聊补充记忆」→ `/photos/{id}/supplement` |
| `src/components/ui/accessible-chat.tsx` | 可选 `variant="supplement"` 黄蓝主题 |

**从首页 / 列表进入**

- 记忆卡列表 `needs_supplement` 卡片点进 → 默认打开 supplement 全屏页（`?chat=1`）  
- 首页「生成描述」快捷入口 → 过滤列表，首张待补充直接进 supplement 页

**验收**

1. 上传一张照片并完成 analyze 后，进 supplement 页，首屏有缩略图 + 问题 1/5  
2. 答 3 题后进度条约 60%（3/5），与 UI 稿一致  
3. 语音输入 → STT → 发送，答案写入 `user_notes` / `ai_questions[].answer`  
4. 全部答完 → 「保存」或「重新理解」与现详情页行为一致

---

### 任务 0.3：首页文本对话 + 意图路由（念念智能体 · 文字版）

**说明：** Phase 3 做语音；Phase 0 先把 **底部输入框** 跑通，与语音共用 intent 层。

**交互**

```
用户输入：「帮我看看最近上传的照片」
  → POST /api/niannian/chat { message, context: { lastFamilyId } }
  → 返回 { reply, intent?, href? }
  → 气泡显示 reply；若有 href 则 1.5s 后 navigate

建议 chips（默认 3 个，随上下文变化）：
  - 识别这张照片的场景
  - 帮我补充记忆卡
  - 生成这张照片的描述
（有 lastPhotoId 时用 photo-scoped chips，否则用 family-scoped）
```

**要新建的文件**

| 文件 | 作用 |
|------|------|
| `src/app/api/niannian/chat/route.ts` | 轻量 LLM + 规则：分类 intent，生成短回复 |
| `src/lib/niannian-chat/intents.ts` | 与 Phase 3 语音共用 intent 枚举 |
| `src/lib/niannian-chat/executor.ts` | intent → `href` / `fetch` |
| `src/lib/niannian-chat/prompts.ts` | system prompt：念念人设、可用能力列表 |
| `src/hooks/useNianNianChat.ts` | 消息列表、send、loading |
| `HomeChatComposer.tsx` | 接入 hook；发送后 append user/assistant 消息 |

**Intent 表（文字 + 语音共用，梳理稿 §五）**

| 用户意图 | intent key | 行为 |
|----------|------------|------|
| 上传 / 添加照片 | `upload_photos` | `/family/{id}/upload` |
| 识别 / 分析照片 | `analyze_photos` | `/family/{id}/photos` 或 analyze 页 |
| 补充记忆 / 描述 | `supplement_memory` | 首张 `needs_supplement` → supplement 页 |
| 生成故事 | `generate_story` | `/family/{id}/photos?generateStory=1` |
| 生成电影 | `generate_movie` | 调 movie generate + hub |
| 欣赏 / 听故事 / 看电影 / 看照片 | `appreciate_*` | 对应 appreciate 路由 |
| 进入创造 / 欣赏模式 | `mode_create` / `mode_appreciate` | `/?create=1` / `/appreciate` |
| 闲聊 / 不懂 | `small_talk` | 仅回复，不跳转 |

**验收**

1. 首页输入「我想上传照片」→ 念念回复 + 跳转 upload  
2. 输入「补充一下刚才那张狗的照片」→ 有最近 photo 时进 supplement 页  
3. chips 点击等价于发送该句

---

### 任务 0.4：GlobalNianNianAgent 与首页分工

| 组件 | 改后职责 |
|------|----------|
| `GlobalNianNianAgent` 浮层 | **保留**：非首页（upload/photos/story 等）快速帮助 + 管道进度 |
| 首页 | **不再依赖浮层**；主对话在 `HomeChatComposer` |
| `NianNianHelpDesk` | 从浮层打开；步骤 3「补充记忆」链到 `/photos/{id}/supplement` |

**要改的文件**

| 文件 | 改什么 |
|------|--------|
| `src/components/GlobalNianNianAgent.tsx` | 在 `/` 隐藏浮泡，或改为小入口「打开帮助台」 |
| `src/lib/agent-steps.ts` | supplement 步骤 href 指向新 supplement 页 |

**验收：** 首页无重复两个念念头像；内页仍有浮层/help desk。

---

## 三、Phase 1（第 3–4 周）欣赏模式 — 老人能直接用

### 任务 1.1：听故事 — 大图、字少、自动播

**用户看到的变化**

| 现在 | 改后 |
|------|------|
| `/stories?appreciate=1` 列表 → 点「自动播放」进播放器 | 列表顶部加 **「从第一篇连续听」** 大按钮 |
| 播放器文字占屏幕约 40% | 欣赏模式下 **图片 ≥70% 高度**，正文 **最多 2 行**，字号 ≥18px |
| 需手动点「开始播放」 | appreciate 模式 **默认 autoStart + 旁白开** |

**要改的文件**

| 文件 | 改什么 |
|------|--------|
| `src/components/h5/InteractiveStoryPlayer.tsx` | `appreciateMode` 时：图片全屏区、`.story-text` 限 2 行、`text-lg` |
| `src/app/stories/page.tsx` | appreciate 时顶部加 `连续听故事` 按钮 |
| `src/app/stories/[id]/play/page.tsx` | 读 `autoplay=1`，传 `initialStarted={true}` |

**验收：** 老人在欣赏模式 3 次点击内听到第一篇故事旁白。

---

### 任务 1.2：看照片 — 记忆卡条 + 时间轴

**布局**

```
┌─────────────────────────────┐
│  2024 · 春节团圆  ← 横向滑动的记忆卡摘要条        │
├─────────────────────────────┤
│  ●────●────●────●  时间轴                        │
│  [照片] [照片] [照片] [照片]   ← 按 taken_at 排列 │
└─────────────────────────────┘
```

**要改的文件**

| 文件 | 改什么 |
|------|--------|
| `src/app/family/memories/page.tsx` | appreciate=1 时用时间轴布局 |
| **新建** `src/components/MemoryTimelineView.tsx` | 记忆卡条 + `PhotoTimeline` |
| **新建** `src/components/MemoryCardChip.tsx` | 缩略图 + 情绪色点 + 6 字摘要 |
| `src/app/appreciate/page.tsx` | 「照片记忆」→ `?appreciate=1&view=timeline` |

**验收：** 欣赏→看照片，首屏按年份排列，带情绪色点。

---

### 任务 1.3：看电影 — 字更少、旁白默认开

| 文件 | 改什么 |
|------|--------|
| `src/app/movies/[id]/play/page.tsx` | appreciate 时旁白默认开 |
| H5 播放器 | appreciate 时控制按钮 ≤3 个 |

---

## 四、Phase 2（第 5–6 周）创造模式 — 上传 + 记忆卡

### 任务 2.1：上传减步骤

**改后路径（3 步）**

```
首页 Agent → 上传照片卡片 / 对话「上传」→ 【单家庭跳过选择】→ upload 页
```

| 文件 | 改什么 |
|------|--------|
| `src/app/page.tsx` / `HomeActionGrid` | 创造模式直跳 upload（`localStorage.lastFamilyId`） |
| `src/components/PhotoUploader.tsx` | `capture` + 「从相册选」「拍一张」 |
| `src/app/family/[id]/upload/page.tsx` | 一屏完成，analyze 完成后 **可选** 直跳 supplement 页 |

**验收：** 老用户从首页到上传 ≤2 次点击；analyze 完可自动进「和念念聊聊」。

---

### 任务 2.2：记忆卡「一眼看懂情绪」

```
┌──────────────────┐
│     [大图]        │
│  🟢 温暖·团聚      │  ← quadrant 四色 + 2 字标签
│  「爸在厨房包饺子」 │
│  ████████░░ 80%   │
└──────────────────┘
```

| 文件 | 改什么 |
|------|--------|
| **新建** `src/lib/affect-display.ts` | quadrant → color + label |
| **新建** `src/components/MemoryCardTile.tsx` | 新卡片布局 |
| `src/app/family/[id]/photos/page.tsx` | grid 换 MemoryCardTile |

---

### 任务 2.3：批量补充

**流程：** 列表多选 → 「批量补充」→ 录音/文字 → `POST /api/memory-card/batch-supplement`

| 文件 | 改什么 |
|------|--------|
| `src/app/family/[id]/photos/page.tsx` | 批量补充按钮 |
| **新建** `BatchSupplementSheet.tsx` | 可复用 `HomeChatComposer` 样式 |
| **新建** `api/memory-card/batch-supplement/route.ts` | LLM 拆分到各 photo notes |

---

## 五、Phase 3（第 7–8 周）念念语音 — 与对话 intent 统一

### 任务 3.1：按住说话 FAB

**UI：** 内页底部 `[ 🎙 按住说话 ]`；首页已有 composer 麦克风，行为一致。

| 文件 | 作用 |
|------|------|
| `src/components/NianNianVoiceButton.tsx` | 按住录音 |
| `src/hooks/useNianNianVoice.ts` | STT → `intents.ts` → `executor.ts` → TTS |
| `src/app/layout.tsx` | 非首页挂载 VoiceButton |

**与 Phase 0.3 共用：** `src/lib/niannian-chat/intents.ts`、`executor.ts`

**验收：** 说「念念，我要看电影」→ 1.5s 内进 `/movies?appreciate=1` + 语音确认。

---

## 六、Phase 4（第 9–11 周）故事 + 电影

### 任务 4.1：自动故事 A/B/C + 9 张限制

**流程：** Preview（记忆卡数/主题/情绪）→ Job 3 variants → `StoryVariantPicker` 三选一

| 文件 | 改什么 |
|------|--------|
| **新建** `StoryGeneratePreview.tsx` | 情绪分布展示 |
| **新建** `src/app/family/[id]/story/pick/page.tsx` | A/B/C 选择 |
| `src/lib/story-engine/index.ts` | `maxStories: 3`；`pickBest9(cards)` |

### 任务 4.2：草稿箱拖拽编辑

- `@dnd-kit` 段落排序 → `POST /api/story/reorder`

### 任务 4.3：电影 — 一主题一故事 + 字幕位置

- `movie-generate-jobs.service.ts`：每主题最新 1 篇已发布 story  
- `movie-render`：`textAnchor` per slide  
- 可选：补充录音 `voice_transcript` 混音

---

## 七、Phase 5（第 12 周）OCR 扫老照片

```
上传页 →「扫描老照片」→ capture → OCR → user_notes 前缀 [OCR]
```

| 文件 | 作用 |
|------|------|
| `src/app/api/photos/[id]/ocr/route.ts` | qwen-vl OCR |
| `PhotoUploader.tsx` | 第三入口 |

---

## 八、不做 / 仅占位

| 项 | 处理 |
|----|------|
| 美化处理（首页网格） | v1 toast 占位；不与 analyze 重复造轮子 |
| Try premium | 静态按钮 + analytics，无支付 |
| #1 漫画版 | stories 页 disabled tab |
| 念念自动开系统相册 | 只导航到 upload |
| #10 付费/硬件 | 埋点 only |

---

## 九、周计划甘特（v3）

| 周 | 任务 ID | 交付物 | 负责人 |
|----|---------|--------|--------|
| **W0–W1** | **0.1** | **首页 Agent 化**（Hero/网格/最近上传/composer UI） | 前端 |
| **W1–W2** | **0.2, 0.4** | **补充记忆卡全屏对话** + 浮层分工 | 全栈 |
| **W2** | **0.3** | **首页文本对话 + intent API** | 全栈 |
| W3 | 1.1, 1.3 | 欣赏听故事/电影 | 前端 |
| W4 | 1.2, 2.1 | 照片时间轴 + 上传减步 | 前端 |
| W5 | 2.2 | 记忆卡情绪卡片 | 前端 |
| W6 | 2.3 | 批量补充 | 全栈 |
| W7–W8 | 3.1 | 念念语音（共用 intent） | 全栈 |
| W9–W10 | 4.1 | 故事 A/B/C + 9 张 | 全栈 |
| W11 | 4.2, 4.3 | 草稿编辑 + 电影 | 全栈 |
| W12 | 5 | OCR | 全栈 |

---

## 十、产品决策（需拍板）

| # | 问题 | 建议默认 | 不拍板的影响 |
|---|------|----------|--------------|
| H1 | 首页是否保留「我要创造/欣赏」双入口？ | **保留**为 Tab，动作网格在创造态展示 | 老人路径变长 |
| H2 | 补充对话固定题 3 + AI 2，还是全 AI？ | **3 固定 + 2 AI**（对齐 UI 稿 1/5） | 问题文案需改 |
| H3 | analyze 完是否自动进 supplement 页？ | **是**（可跳过） | 上传闭环多一步 |
| 6 | 自动故事最多几张图？ | **9 张** | 引擎不改 |
| 8 | 一个主题几篇故事进电影？ | **1 篇** | 电影可能多 story 拼接 |
| 1 | 漫画版？ | **不做**，占位 | — |

---

## 十一、代码索引（Phase 0 优先）

```
首页入口           src/app/page.tsx
首页 Agent 壳      src/components/home/HomeAgentPage.tsx（待建）
补充对话页         src/app/photos/[id]/supplement/page.tsx（待建）
补充逻辑           src/hooks/useSupplementChat.ts（待建）
现有补充面板       src/components/UserSupplementPanel.tsx
固定问题           src/lib/supplement-questions.ts
聊天 UI 基座       src/components/ui/accessible-chat.tsx
完成度             src/lib/memory-card-completion.ts
Intent 层          src/lib/niannian-chat/intents.ts（待建，语音共用）
念念浮层           src/components/GlobalNianNianAgent.tsx
语音 STT           src/hooks/useVoiceInput.ts
欣赏入口           src/app/appreciate/page.tsx
记忆卡列表         src/app/family/[id]/photos/page.tsx
故事引擎           src/lib/story-engine/index.ts
电影 job           src/lib/jobs/movie-generate-jobs.service.ts
```

### Phase 0 建议实施顺序（给 Cursor）

```
1. supplement-questions.ts + useSupplementChat（抽离逻辑）
2. NianNianSupplementChat + /photos/[id]/supplement/page.tsx
3. HomeAgentPage 静态布局（无 API）
4. HomeRecentUploads + HomeActionGrid 接路由
5. /api/niannian/chat + HomeChatComposer
6. GlobalNianNianAgent 首页隐藏 + agent-steps 更新
```

---

*2026-08-17 · 具体版 v3（含首页改造 + 念念智能体对话）*
