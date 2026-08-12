const REQUEST_ID_HEADER = 'x-request-id';
const TRACE_ID_HEADER = 'x-trace-id';

/** Edge / Node 通用 — 不使用 node:crypto，避免 middleware Edge 运行时崩溃 */
export function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getRequestIdFromHeaders(headers: Headers): string | null {
  return headers.get(REQUEST_ID_HEADER) || headers.get(TRACE_ID_HEADER);
}

export function resolveRequestId(headers: Headers): string {
  return getRequestIdFromHeaders(headers) ?? createRequestId();
}

export function withRequestIdHeaders(
  response: Response,
  requestId: string
): Response {
  const headers = new Headers(response.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  headers.set(TRACE_ID_HEADER, requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export { REQUEST_ID_HEADER, TRACE_ID_HEADER };
