# 魔搭 MCP 广场 / 赛事投稿填写指南

> 生成时间：2026-08-13  
> 可直接复制以下内容到魔搭投稿页

---

## 1. MCP 公网链接（投稿 URL）

```
https://niannian-years.top/mcp
```

- **协议**：Streamable HTTP（MCP 2024-11-05）
- **传输**：HTTPS，443 端口
- **备用调试**（自签证书，**不可用于正式投稿**）：`https://niannian-years.top:8799/mcp`

---

## 2. 服务基本信息

| 字段 | 填写内容 |
|------|----------|
| **服务名称** | 念念年年家庭记忆助手 |
| **英文名 / ID** | niannian |
| **简介** | 连接念念年年 App，搜索家庭记忆、查看故事与人生电影进度、查询 AI 模型配置状态。 |
| **分类** | 生活助手 / 开发者工具 |
| **协议类型** | Streamable HTTP |
| **是否需要 API Key** | 否（公网 URL 直连；部分工具需服务端 Session，评测可用 `get_ai_status`） |

---

## 3. 工具列表（8 个）

| 工具名 | 说明 | 必填参数 | 需登录 |
|--------|------|----------|--------|
| `get_ai_status` | 查看 AI 模型配置状态 | — | ❌ |
| `search_memories` | 搜索家庭记忆卡 | — | ✅ |
| `list_families` | 列出用户家庭空间 | — | ✅ |
| `get_pipeline_progress` | 念念 5 步流水线进度 | — | ✅ |
| `list_stories` | 列出家庭故事 | `family_id` | ✅ |
| `get_story` | 获取故事详情 | `story_id` | ✅ |
| `list_movies` | 列出人生电影 | `family_id` | ✅ |
| `get_movie` | 获取电影详情 | `movie_id` | ✅ |

完整 Schema 见：`services/mcp-niannian/tools.json`

---

## 4. 服务描述（长文案，可直接粘贴）

```markdown
## 念念年年 MCP — 家庭记忆助手

将念念年年 App 的家庭记忆能力以 MCP 标准协议暴露，供大模型 Agent 调用。

### 核心能力
- **记忆搜索**：按关键词、人物、地点、时间筛选家庭记忆卡
- **家庭管理**：列出家庭空间、查看 5 步创作流水线进度
- **内容读取**：获取已生成的家庭故事与人生电影详情
- **AI 状态**：无需登录即可查询当前 AI 模型配置（不含密钥）

### 技术规格
- 协议：MCP Streamable HTTP（2024-11-05）
- 端点：`https://niannian-years.top/mcp`
- 工具数：8
- 源码：`services/mcp-niannian/`

### 快速验证
```bash
python3 scripts/verify-mcp-public.py https://niannian-years.top/mcp
# 期望：PASS protocol=2024-11-05 tools=8
```

### 演示建议
公网评测优先调用 `get_ai_status`（无需登录），或配合演示账号 Session 调用 `list_families`。
```

---

## 5. 魔搭操作步骤

### 5.1 MCP 实验场试调

1. 打开 [魔搭 MCP 广场](https://www.modelscope.cn/mcp)
2. 进入 **MCP 实验场**
3. 若支持「外部 URL / Streamable HTTP」：填入 `https://niannian-years.top/mcp`
4. 若仅支持 **Hosted SSE**：需改用魔搭云托管（见主文档方案 B），或等 443 + LE 证书就绪后联系平台确认 Streamable HTTP 支持

### 5.2 赛事 / 作品投稿

1. 进入赛事作品提交页
2. **MCP 链接** 字段填写：`https://niannian-years.top/mcp`
3. 上传源码 ZIP（可选）：`niannian-d9acf0d-20260813-src.zip`
4. 提交后平台自动执行 `initialize` + `tools/list` 握手

### 5.3 MCP 广场上架（如有「创建服务」入口）

1. 登录魔搭账号
2. MCP 广场 → **创建 MCP 服务** / **发布**
3. 部署方式选 **外部托管 / 自提供 URL**
4. 粘贴上方链接与工具说明
5. 保存并提交审核

---

## 6. 投稿前自检清单

- [ ] `pm2 list` 中 `niannian` 与 `niannian-mcp` 均为 **online**
- [ ] `curl http://127.0.0.1:3000/api/ai/status` 返回 JSON
- [ ] `python3 scripts/verify-mcp-public.py https://niannian-years.top/mcp` 输出 **PASS**
- [ ] 443 端口公网可达（非自签 8799）
- [ ] TLS 为 Let's Encrypt 或受信 CA（非自签证书）

---

## 7. 当前部署状态（2026-08-13）

| 检查项 | 状态 |
|--------|------|
| Next.js 主站 | ✅ online |
| MCP 进程 (8080) | ✅ online，Session 已刷新 |
| Nginx 本地反代 /mcp | ✅ 200 |
| 公网 HTTP (80) | ✅ 200 |
| 公网 MCP 8799（自签） | ✅ 功能正常 |
| 公网 HTTPS 443 | ⚠️ **超时** — 需在路由器/防火墙放行 443 → 本机 |
| LE 证书 | ⚠️ 仍为自签，443 通后执行 certbot |

### 443 未通时的修复步骤

```bash
# 1. 路由器/NAT：外网 443 → 内网 10.30.30.189:443
# 2. 服务器防火墙放行 443
sudo ufw allow 443/tcp

# 3. 申请 Let's Encrypt
sudo certbot certonly --nginx -d niannian-years.top -d www.niannian-years.top

# 4. 更新 nginx 证书路径后 reload
sudo nginx -t && sudo systemctl reload nginx

# 5. 再次验证
python3 scripts/verify-mcp-public.py https://niannian-years.top/mcp
```
