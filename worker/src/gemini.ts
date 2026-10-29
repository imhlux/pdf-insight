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
const TIMEOUT_MS = 45_000

// Free-tier models are sometimes overloaded (503), out of quota (429) or
// retired (404). In those cases the next model from the list is tried.
const FALLBACK_STATUSES = new Set([404, 429, 500, 503, 504])

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

async function callModel(options: GenerateOptions, model: string): Promise<Response> {
  return fetch(`${API_URL}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': options.apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: options.contents,
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseJsonSchema: options.jsonSchema,
      },
    }),
  })
}

// Returns the raw text of the answer. Parsing and validation happen in analyze.ts.
export async function generateJson(options: GenerateOptions): Promise<GenerateResult> {
  let lastError = new HttpError(502, 'ai_unavailable')

  for (const model of options.models) {
    let response: Response
    try {
      response = await callModel(options, model)
    } catch {
      lastError = new HttpError(502, 'ai_unavailable') // network error or timeout
      continue
    }

    if (response.ok) {
      const data: GeminiResponse = await response.json()
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
      if (!text) throw new HttpError(502, 'ai_invalid_response')
      return { text, model }
    }

    // The error body comes from Google and never contains the document.
    console.error('Gemini error', model, response.status, (await response.text()).slice(0, 300))
    lastError =
      response.status === 429
        ? new HttpError(429, 'ai_quota')
        : new HttpError(502, 'ai_unavailable')
    if (!FALLBACK_STATUSES.has(response.status)) break
  }

  throw lastError
}
