import type { ApiErrorCode } from '../../shared/schema'

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
  ) {
    super(code)
  }
}

export function allowedOrigin(request: Request, allowedOrigins: string): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null
  const allowed = allowedOrigins.split(',').map((o) => o.trim())
  return allowed.includes(origin) ? origin : null
}

export function corsHeaders(origin: string): Record<string, string> {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

export function json(body: unknown, status: number, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export function errorResponse(error: HttpError, headers: HeadersInit = {}): Response {
  return json({ error: { code: error.code } }, error.status, headers)
}
