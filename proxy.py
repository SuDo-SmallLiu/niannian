"""念念年年 - 反向代理（支持 PATCH/DELETE/PUT，供 :8799 等入口使用）"""
import http.server
import urllib.request
import sys
import os

BACKEND = os.environ.get("BACKEND", "http://127.0.0.1:3000")
PORT = int(os.environ.get("PORT", "8799"))
TIMEOUT = int(os.environ.get("PROXY_TIMEOUT", "120"))

FORWARD_HEADERS = (
    "content-type",
    "accept",
    "accept-encoding",
    "accept-language",
    "cookie",
    "user-agent",
    "authorization",
    "x-forwarded-for",
    "x-forwarded-proto",
    "x-real-ip",
    "cf-connecting-ip",
    "cf-ipcountry",
    "cf-ray",
    "cf-visitor",
)


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        self._proxy("GET")

    def do_POST(self):
        self._proxy("POST")

    def do_PUT(self):
        self._proxy("PUT")

    def do_PATCH(self):
        self._proxy("PATCH")

    def do_DELETE(self):
        self._proxy("DELETE")

    def do_HEAD(self):
        self._proxy("HEAD")

    def do_OPTIONS(self):
        self._proxy("OPTIONS")

    def _proxy(self, method):
        try:
            url = f"{BACKEND}{self.path}"
            data = None
            if method in ("POST", "PUT", "PATCH", "DELETE"):
                content_len = int(self.headers.get("Content-Length", 0))
                if content_len > 0:
                    data = self.rfile.read(content_len)

            req = urllib.request.Request(url, data=data, method=method)

            for h in FORWARD_HEADERS:
                v = self.headers.get(h)
                if v:
                    req.add_header(h, v)

            # 告知 Next.js 原始协议（HTTPS 终止在 nginx/外层时由外层设置；此处默认 http）
            if not self.headers.get("x-forwarded-proto"):
                req.add_header("X-Forwarded-Proto", "http")

            resp = urllib.request.urlopen(req, timeout=TIMEOUT)

            self.send_response(resp.status)
            for k, v in resp.headers.items():
                if k.lower() not in ("transfer-encoding", "connection"):
                    self.send_header(k, v)
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ("transfer-encoding", "connection"):
                    self.send_header(k, v)
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            try:
                self.send_response(502)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"代理错误: {e}".encode())
            except Exception:
                pass

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), ProxyHandler)
    print(f"念念年年反向代理: 0.0.0.0:{PORT} -> {BACKEND}", flush=True)
    server.serve_forever()
