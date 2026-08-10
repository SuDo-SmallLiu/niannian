# 念念年年 MCP Server

将念念年年 Next.js API 暴露为 [Model Context Protocol](https://modelcontextprotocol.io/) 工具，供 Cursor / Claude / 赛事平台调用。

## 工具列表

| 工具 | 说明 |
|------|------|
| `search_memories` | 搜索记忆卡 |
| `list_families` | 列出家庭 |
| `get_pipeline_progress` | 念念 5 步进度 |
| `list_stories` / `get_story` | 故事列表与详情 |
| `list_movies` / `get_movie` | 人生电影列表与详情 |
| `get_ai_status` | AI 配置状态 |

## 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `NIANNIAN_BASE_URL` | 否 | 念念 API 地址，默认 `http://127.0.0.1:3000` |
| `NIANNIAN_SESSION` | 是* | 登录 Cookie `niannian_session` 的值 |
| `HOST` | 否 | MCP 监听地址，默认 `0.0.0.0` |
| `PORT` | 否 | MCP 端口，默认 `8080` |

\* `get_ai_status` 无需 session，其余工具需要。

### 获取 Session

1. 浏览器登录 https://niannian-years.top
2. 开发者工具 → Application → Cookies → 复制 `niannian_session`

## 本地启动

```bash
cd services/mcp-niannian
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# 编辑 .env 填入 NIANNIAN_SESSION

export $(grep -v '^#' .env | xargs)
python mcp_server.py
```

MCP 端点：`http://localhost:8080/mcp`

## 验证（mcp-link-guide）

```bash
# 1. 确认服务在跑
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/mcp

# 2. 用 MCP Inspector 或 Cursor 连接 http://localhost:8080/mcp
#    确认 initialize 成功、tools/list 返回 8 个工具
```

## 公网部署（赛事投稿）

按 [mcp-link-guide](https://modelcontextprotocol.io/) 要求：

1. 部署到云主机 / 容器，监听 `0.0.0.0:$PORT`
2. Nginx 反代到 `/mcp`，启用 HTTPS
3. 最终链接形如：`https://your-domain.com/mcp`
4. 投稿前从**外网**验证 `initialize` + `tools/list` + 至少一次工具调用

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

## Claude Desktop（stdio）

```json
{
  "mcpServers": {
    "niannian": {
      "command": "/path/to/services/mcp-niannian/.venv/bin/python",
      "args": ["/path/to/services/mcp-niannian/mcp_server_stdio.py"],
      "env": {
        "NIANNIAN_BASE_URL": "https://niannian-years.top",
        "NIANNIAN_SESSION": "你的session值"
      }
    }
  }
}
```

## Cursor 接入

Settings → MCP → Add server → URL: `http://localhost:8080/mcp`（本地）或公网 HTTPS 地址。

## Docker

```bash
docker build -t niannian-mcp .
docker run -p 8080:8080 \
  -e NIANNIAN_BASE_URL=https://niannian-years.top \
  -e NIANNIAN_SESSION=xxx \
  niannian-mcp
```
