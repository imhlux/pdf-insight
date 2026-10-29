import { z } from 'zod'
import { chunkPages } from '../../shared/chunk'
import { detectPromptInjection } from '../../shared/injection'
import { mergeLists, normalizeAiResult } from '../../shared/normalize'
import {
  aiResultSchema,
  insightSchema,
  type AiResult,
  type AnalyzeRequest,
  type Insight,
} from '../../shared/schema'
import { generateJson, type Content, type Part } from './gemini'
import { HttpError } from './http'
import {
  OCR_NOTE,
  REDUCE_INSTRUCTION,
  SYSTEM_INSTRUCTION,
  documentPrompt,
  retryPrompt,
} from './prompt'

export interface AnalyzeConfig {
  apiKey: string
  models: string[]
}

// Collects which models actually answered (fallbacks can differ per call).
type UsedModels = Set<string>

const reduceSchema = aiResultSchema.pick({
  document: true,
  summary: true,
  keyPoints: true,
  keywords: true,
})

// Gemini accepts a subset of JSON Schema. Zod generates a few keywords it
// does not support ("pattern", "$schema"); Zod still checks them afterwards.
function stripUnsupported(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupported)
  if (typeof node !== 'object' || node === null) return node
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key]) => key !== '$schema' && key !== 'pattern')
      .map(([key, value]) => [key, stripUnsupported(value)]),
  )
}

const toGeminiSchema = (schema: z.ZodType) => stripUnsupported(z.toJSONSchema(schema)) as object

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

// One model call + Zod validation. Per the brief: an invalid answer gets
// exactly one retry (with the validation errors as feedback), then we fail.
async function askValidated<T>(
  schema: z.ZodType<T>,
  config: AnalyzeConfig,
  used: UsedModels,
  system: string,
  parts: Part[],
): Promise<T> {
  const contents: Content[] = [{ role: 'user', parts }]
  const jsonSchema = toGeminiSchema(schema)

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { text: raw, model } = await generateJson({ ...config, system, contents, jsonSchema })
    used.add(model)
    const result = schema.safeParse(normalizeAiResult(parseJson(raw)))
    if (result.success) return result.data

    const issues = parseJson(raw) === undefined ? 'invalid JSON' : z.prettifyError(result.error)
    contents.push(
      { role: 'model', parts: [{ text: raw }] },
      { role: 'user', parts: [{ text: retryPrompt(issues) }] },
    )
  }
  throw new HttpError(502, 'ai_invalid_response')
}

async function analyzeChunks(
  chunks: string[],
  imageParts: Part[],
  config: AnalyzeConfig,
  used: UsedModels,
): Promise<AiResult> {
  if (chunks.length <= 1) {
    const parts: Part[] = [{ text: documentPrompt(chunks[0] ?? '') }, ...imageParts]
    return askValidated(aiResultSchema, config, used, SYSTEM_INSTRUCTION, parts)
  }

  // Long document: analyse fragments in parallel (map), then let the model
  // write one summary from the partial results (reduce). Lists are merged in
  // code so nothing found in a fragment gets lost.
  const partials = await Promise.all(
    chunks.map((chunk, i) => {
      const isLast = i === chunks.length - 1
      const parts: Part[] = [
        { text: documentPrompt(chunk, { index: i + 1, total: chunks.length }) },
        ...(isLast ? imageParts : []),
      ]
      return askValidated(aiResultSchema, config, used, SYSTEM_INSTRUCTION, parts)
    }),
  )

  const digest = partials.map(({ document, summary, keyPoints, keywords }) => ({
    document,
    summary,
    keyPoints,
    keywords,
  }))
  const reduced = await askValidated(reduceSchema, config, used, REDUCE_INSTRUCTION, [
    { text: JSON.stringify(digest) },
  ])

  return { ...reduced, ...mergeLists(partials), keywords: reduced.keywords }
}

export async function analyzeDocument(
  request: AnalyzeRequest,
  config: AnalyzeConfig,
): Promise<Insight> {
  const chunks = chunkPages(request.pages)
  if (chunks.length === 0 && request.images.length === 0) {
    throw new HttpError(400, 'bad_request')
  }

  const imageParts: Part[] = request.images.length
    ? [
        { text: OCR_NOTE },
        ...request.images.map((img) => ({
          inlineData: { mimeType: img.mimeType, data: img.data },
        })),
      ]
    : []

  const used: UsedModels = new Set()
  const result = await analyzeChunks(chunks, imageParts, config, used)

  const ocrPages = request.images.map((img) => img.page)
  const emptyPages = request.pages
    .map((text, i) => (text.trim() ? 0 : i + 1))
    .filter((page) => page > 0 && !ocrPages.includes(page))

  const warnings: string[] = []
  if (detectPromptInjection(request.pages.join('\n'))) {
    warnings.push(
      'Dokument zawiera fragment, który wygląda na polecenie dla systemu AI (prompt injection). Potraktowano go jako zwykły tekst i nie wykonano.',
    )
  }
  if (ocrPages.length) {
    warnings.push(
      `Odczytano z obrazu strony bez warstwy tekstowej: ${ocrPages.join(', ')}. Sprawdź dane z tych stron.`,
    )
  }
  if (emptyPages.length) {
    warnings.push(`Nie przeanalizowano stron bez warstwy tekstowej: ${emptyPages.join(', ')}.`)
  }

  // Final check of the full contract before anything leaves the Worker.
  return insightSchema.parse({
    ...result,
    document: { ...result.document, fileName: request.fileName, pages: request.pages.length },
    analysis: {
      model: [...used].join(', '),
      chunks: Math.max(chunks.length, 1),
      ocrPages,
      warnings,
      createdAt: new Date().toISOString(),
    },
  })
}
