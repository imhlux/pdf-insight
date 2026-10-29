import { MAX_TEXT_CHARS, analyzeRequestSchema } from '../../shared/schema'
import { analyzeDocument } from './analyze'
import { HttpError, allowedOrigin, corsHeaders, errorResponse, json } from './http'

export interface Env {
  GEMINI_API_KEY: string
  GEMINI_MODEL: string
  ALLOWED_ORIGINS: string
  RATE_LIMITER: RateLimit
}

// Text of up to 300k characters plus up to 4 page images.
const MAX_BODY_CHARS = 8_000_000

async function handleAnalyze(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const { success } = await env.RATE_LIMITER.limit({ key: ip })
  if (!success) throw new HttpError(429, 'rate_limited')

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) {
    throw new HttpError(413, 'payload_too_large')
  }
  const raw = await request.text()
  if (raw.length > MAX_BODY_CHARS) throw new HttpError(413, 'payload_too_large')

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'bad_request')
  }

  const parsed = analyzeRequestSchema.safeParse(body)
  if (!parsed.success) throw new HttpError(400, 'bad_request')

  const totalChars = parsed.data.pages.reduce((sum, page) => sum + page.length, 0)
  if (totalChars > MAX_TEXT_CHARS) throw new HttpError(413, 'payload_too_large')

  const insight = await analyzeDocument(parsed.data, {
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  })
  return json(insight, 200)
}

export default {
  async fetch(request, env): Promise<Response> {
    // Only the demo origin may call the API (and localhost in local dev).
    const origin = allowedOrigin(request, env.ALLOWED_ORIGINS)
    if (!origin) return errorResponse(new HttpError(403, 'forbidden_origin'))
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    const { pathname } = new URL(request.url)
    if (request.method !== 'POST' || pathname !== '/analyze') {
      return errorResponse(new HttpError(404, 'bad_request'), cors)
    }

    try {
      const response = await handleAnalyze(request, env)
      Object.entries(cors).forEach(([key, value]) => response.headers.set(key, value))
      return response
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error, cors)
      // Log only the error itself, never the document content.
      console.error('Unhandled error', error instanceof Error ? error.message : error)
      return errorResponse(new HttpError(500, 'internal'), cors)
    }
  },
} satisfies ExportedHandler<Env>
