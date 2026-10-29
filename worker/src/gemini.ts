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

export interface GenerateOptions {
  apiKey: string
  model: string
  system: string
  contents: Content[]
  jsonSchema: object
}

// Returns the raw text of the answer. Parsing and validation happen in analyze.ts.
export async function generateJson(options: GenerateOptions): Promise<string> {
  const response = await fetch(`${API_URL}/${options.model}:generateContent`, {
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
  }).catch(() => {
    throw new HttpError(502, 'ai_unavailable')
  })

  if (response.status === 429) throw new HttpError(429, 'ai_quota')
  if (!response.ok) {
    // The error body comes from Google and never contains the document.
    console.error('Gemini error', response.status, (await response.text()).slice(0, 500))
    throw new HttpError(502, 'ai_unavailable')
  }

  const data: GeminiResponse = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new HttpError(502, 'ai_invalid_response')
  return text
}
