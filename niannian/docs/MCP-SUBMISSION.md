# 念念年年 MCP 评测复测说明

> 公网端点（TLS 就绪后）：`https://niannian-years.top/mcp`  
> 协议：**Streamable HTTP**（MCP 2024-11-05）  
> 工具数：**8**

## 1. 无需登录的工具

| 工具 | 说明 |
|------|------|
| `get_ai_status` | 返回 `{ configured, visionModels[], textModels[] }`，**不含** API Key 或网关地址 |

其余 7 个工具需有效登录 Session（`NIANNIAN_SESSION` Cookie 值）。

## 2. 工具列表

| 名称 | 必填参数 |
|------|----------|
| `search_memories` | — |
| `list_families` | — |
| `get_pipeline_progress` | — |
| `list_stories` | `family_id` |
| `get_story` | `story_id` |
| `list_movies` | `family_id` |
| `get_movie` | `movie_id` |
| `get_ai_status` | — |

声明文件：`services/mcp-niannian/tools.json`（需与运行时 `tools/list` 名称集合一致）。

## 3. 公网 TLS 验证（必须使用系统 CA，禁止 `verify=False`）

```bash
cd niannian
python3 scripts/verify-mcp-public.py https://niannian-years.top/mcp
```

**期望输出：**

- `PASS protocol=... tools=8`
- `initialize` / `tools/list` / `tools/call get_ai_status` 三段延迟

自签证书阶段会 `FAIL TLS: CERTIFICATE_VERIFY_FAILED` — 需先完成 Let's Encrypt（见下）。

## 4. 本地验证

```bash
# Next.js + MCP 均在运行
curl -s http://127.0.0.1:3000/api/ai/status
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8080/mcp

cd services/mcp-niannian
pytest ../../tests/mcp/test_contract.py -v
```

## 5. TLS / Nginx 部署（Task 1）

```bash
sudo certbot certonly --nginx -d niannian-years.top -d www.niannian-years.top
```

Nginx `/mcp` 反代到 **127.0.0.1:8080**（非 8799）：

```nginx
location /mcp {
    proxy_pass http://127.0.0.1:8080/mcp;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_read_timeout 86400s;
}
```

## 6. CI 质量门禁

Push 到 `main` 时 GitHub Actions `Quality` workflow 执行：

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
pytest tests/mcp/test_contract.py -v
```

## 7. 演示账号策略

- 生产默认 `AUTH_SMS=true`，验证码不会写入日志或 API 响应
- 本地开发 `AUTH_SMS=false` 时，send-code 可在响应中返回 `code` 字段
- 快速登录 `/api/auth/quick-login` 在生产环境默认 **403**（除非 `ALLOW_DEV_AUTH=true` 演示专用）

## 8. 已知限制

- MCP 为单进程 PM2，OTP 限流为进程内计数
- 人生电影 MP4 渲染耗时较长，公网演示建议优先 `get_ai_status` + `list_families` + `get_story`
- 8799 端口自签 HTTPS 不被标准 MCP 客户端信任；投稿请使用 **443 + LE 证书**
