# 魔搭「可托管部署」完整指南

> 解决 `invalid_parameters_bind_infra_source`：必须绑定 **GitHub 来源 + PyPI 包名**。

---

## 原理

魔搭「可托管部署」会在阿里云函数计算上执行：

```bash
uvx niannian-mcp-server
```

平台把 stdio MCP 转成 **SSE 地址**供实验场调用。因此需要：

1. **GitHub 仓库**（infra source）
2. **PyPI 已发布包** `niannian-mcp-server`（与 uvx args 一致）
3. **stdio 模式**（已在 `src/niannian_mcp/` 实现）

你的公网 API `https://niannian-years.top` 仍作为后端，魔搭托管的是 MCP 桥接进程。

---

## 第一步：推送代码到 GitHub

```bash
cd /home/clawdbot/niannian/niannian
git add services/mcp-niannian/pyproject.toml services/mcp-niannian/src/
git commit -m "feat(mcp): add PyPI package for ModelScope hosted deployment"
git push origin main
```

**来源地址（必填）**：

```
https://github.com/SuDo-SmallLiu/niannian
```

---

## 第二步：发布到 PyPI

1. 注册 https://pypi.org/account/register/
2. 创建 API Token（Account → API tokens → Add token）
3. 发布：

```bash
cd services/mcp-niannian
uv build
uv publish --token pypi-你的Token
```

4. 验证：

```bash
uvx niannian-mcp-server --help 2>&1 | head -3
# 或
pip index versions niannian-mcp-server
```

---

## 第三步：魔搭创建 MCP（按字段填）

创建链接：https://modelscope.cn/mcp/servers/create?template=customize

### 基础信息

| 字段 | 填写 |
|------|------|
| **创建方式** | **GitHub 快速创建**（不要只选自定义） |
| **来源地址** | `https://github.com/SuDo-SmallLiu/niannian` |
| **代码子路径**（如有） | `services/mcp-niannian` |
| **英文名称** | `niannian-mcp-server` |
| **中文名称** | `念念年年家庭记忆助手` |
| **托管类型** | **可托管部署** |

### 服务配置

| 字段 | 填写 |
|------|------|
| **安装命令** | `uvx` |
| **鉴权类型** | **无鉴权** |

**服务配置 JSON**：

```json
{
  "mcpServers": {
    "niannian": {
      "command": "uvx",
      "args": ["niannian-mcp-server"],
      "env": {
        "NIANNIAN_BASE_URL": "https://niannian-years.top"
      }
    }
  }
}
```

> `NIANNIAN_SESSION` 可在魔搭「环境变量」里填演示账号 Session，供鉴权工具使用；`get_ai_status` 无需 Session。

---

## 第四步：部署成功后

魔搭会生成 **Hosted SSE URL**，形如：

```
https://mcp.api-inference.modelscope.net/xxxxxxxx/sse
```

在 MCP 实验场填入该 SSE 地址即可体验。

---

## 常见错误

| 错误 | 原因 | 处理 |
|------|------|------|
| `invalid_parameters_bind_infra_source` | 未填 GitHub 来源，或包名与 PyPI 不一致 | 填 GitHub URL + 先发布 PyPI |
| 部署失败退化「仅本地可用」 | PyPI 无此包 / uvx 启动失败 | `uvx niannian-mcp-server` 本地测通 |
| 工具调用 upstream_error | 后端 API 不可达 | 确认 niannian-years.top 在线 |

---

## 赛事双链接（如需要）

| 用途 | 链接 |
|------|------|
| 魔搭 Hosted SSE | 部署后平台生成的 URL |
| 公网 Streamable HTTP | `https://niannian-years.top/mcp` |

两个都已验证可用时，按赛事要求填对应字段。
