import { HttpError } from './http'

// Minimal client for the Gemini REST API (generateContent).
// Docs: https://ai.google.dev/api/generate-content

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

export interface Content {
  role: 'user' | 'model'
  parts: Part[]
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
}

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
// A request that takes longer than this is treated as hanging.
const TIMEOUT_MS = 25_000
// If a model has not answered after this time, the next model starts in
// parallel and the first answer wins ("hedged requests").
const HEDGE_AFTER_MS = 12_000

// Free-tier models are sometimes overloaded (503), out of quota (429) or
// retired (404). In those cases another model can still answer. Other
// errors (400 bad request, 403 bad key) would fail the same way everywhere.
const RETRYABLE_STATUSES = new Set([404, 429, 500, 503, 504])

export interface GenerateOptions {
  apiKey: string
  models: string[]
  system: string
  contents: Content[]
  jsonSchema: object
}

export interface GenerateResult {
  text: string
  model: string
}

// Failure of one model. "fatal" means trying another model will not help.
class ModelError extends Error {
  constructor(
    readonly httpError: HttpError,
    readonly fatal: boolean,
  ) {
    super(httpError.code)
  }
}

async function tryModel(
  options: GenerateOptions,
  model: string,
  signal: AbortSignal,
): Promise<GenerateResult> {
  let response: Response
  try {
    response = await fetch(`${API_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': options.apiKey },
      // Stops on timeout, or when another model has already answered.
      signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: options.contents,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseJsonSchema: options.jsonSchema,
          // Extraction does not need long reasoning, and default thinking made
          // a 12-page contract take over 25 s. Low thinking keeps it fast.
          thinkingConfig: { thinkingLevel: 'low' },
        },
      }),
    })
  } catch (error) {
    if (!signal.aborted) {
      console.error('Gemini request failed', model, error instanceof Error ? error.name : error)
    }
    throw new ModelError(new HttpError(502, 'ai_unavailable'), false)
  }

  if (!response.ok) {
    // The error body comes from Google and never contains the document.
    console.error('Gemini error', model, response.status, (await response.text()).slice(0, 300))
    const httpError =
      response.status === 429
        ? new HttpError(429, 'ai_quota')
        : new HttpError(502, 'ai_unavailable')
    throw new ModelError(httpError, !RETRYABLE_STATUSES.has(response.status))
  }

  const data: GeminiResponse = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new ModelError(new HttpError(502, 'ai_invalid_response'), false)
  return { text, model }
}

// Returns the raw text of the first model that answers. Parsing and
// validation happen in analyze.ts.
//
// Models are started in list order. The next one starts when the previous
// one fails, or when it has been silent for HEDGE_AFTER_MS. So a hanging
// model costs 12 s instead of 25 s, and a fast answer costs one request.
export function generateJson(options: GenerateOptions): Promise<GenerateResult> {
  return new Promise((resolve, reject) => {
    const controllers: AbortController[] = []
    let nextIndex = 0
    let running = 0
    let settled = false
    let lastError = new HttpError(502, 'ai_unavailable')
    let hedgeTimer: ReturnType<typeof setTimeout> | null = null

    const settle = (finish: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(hedgeTimer)
      controllers.forEach((controller) => controller.abort()) // cancel the losers
      finish()
    }

    const startNext = () => {
      clearTimeout(hedgeTimer)
      if (settled) return
      const model = options.models[nextIndex]
      if (model === undefined) {
        // No models left: fail only when the ones still running have failed too.
        if (running === 0) settle(() => reject(lastError))
        return
      }
      nextIndex++
      running++
      const controller = new AbortController()
      controllers.push(controller)
      hedgeTimer = setTimeout(startNext, HEDGE_AFTER_MS)

      tryModel(options, model, controller.signal).then(
        (result) => settle(() => resolve(result)),
        (error: unknown) => {
          running--
          if (!(error instanceof ModelError)) return settle(() => reject(error))
          lastError = error.httpError
          if (error.fatal) settle(() => reject(error.httpError))
          else startNext()
        },
      )
    }

    startNext()
  })
}
