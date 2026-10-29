import {
  apiErrorSchema,
  insightSchema,
  type AnalyzeRequest,
  type Insight,
} from '../../shared/schema'
import { AppError } from '../lib/errors'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')
const TIMEOUT_MS = 90_000

// Sends extracted text to our Worker (never to the AI provider directly, the
// API key lives only on the server) and validates the answer before the UI
// renders anything.
export async function analyze(request: AnalyzeRequest, signal?: AbortSignal): Promise<Insight> {
  if (!API_URL) throw new AppError('config')

  let response: Response
  try {
    response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      // Ends on whichever comes first: the user's "Anuluj" or the timeout.
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)])
        : AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
    throw new AppError(isTimeout ? 'timeout' : 'network')
  }

  const data: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const apiError = apiErrorSchema.safeParse(data)
    throw new AppError(apiError.success ? apiError.data.error.code : 'internal')
  }

  const insight = insightSchema.safeParse(data)
  if (!insight.success) throw new AppError('invalid_response')
  return insight.data
}
