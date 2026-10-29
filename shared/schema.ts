import { z } from 'zod'

// Shared between the React app and the Cloudflare Worker, so both sides
// validate the AI output against exactly the same contract.

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const

const isoDate = z.iso.date() // YYYY-MM-DD
const languageCode = z.string().regex(/^[a-z]{2}$/, 'ISO 639-1, np. "pl"')
const currencyCode = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217, np. "PLN"')
const text = z.string().trim().min(1)

// Fields the model is allowed to fill. fileName and pages are known on the
// client, so the model never has a chance to get them wrong.
export const aiDocumentSchema = z.object({
  language: languageCode,
  type: z.enum(DOCUMENT_TYPES),
  title: text.nullable(),
  date: isoDate.nullable(),
})

export const amountSchema = z.object({
  value: z.number().finite(),
  currency: currencyCode,
  context: text,
})

export const dateEntrySchema = z.object({
  date: isoDate,
  context: text,
})

export const aiResultSchema = z.object({
  document: aiDocumentSchema,
  summary: text.max(1500),
  keyPoints: z.array(text).min(3).max(7),
  entities: z.object({
    organizations: z.array(text),
    people: z.array(text),
  }),
  amounts: z.array(amountSchema),
  dates: z.array(dateEntrySchema),
  keywords: z.array(text),
})

// Final document returned to the user. Same shape as in the brief (section 04)
// plus an extra "analysis" block, which the brief allows ("pola można dodawać").
export const insightSchema = aiResultSchema.extend({
  document: aiDocumentSchema.extend({
    fileName: text,
    pages: z.number().int().positive(),
  }),
  analysis: z.object({
    model: text,
    chunks: z.number().int().positive(),
    ocrPages: z.array(z.number().int().positive()),
    warnings: z.array(text),
    createdAt: z.iso.datetime(),
  }),
})

export type AiResult = z.infer<typeof aiResultSchema>
export type Insight = z.infer<typeof insightSchema>
export type Amount = z.infer<typeof amountSchema>
export type DateEntry = z.infer<typeof dateEntrySchema>

// Request body sent from the app to the Worker.
export const MAX_TEXT_CHARS = 300_000
export const MAX_OCR_PAGES = 4
export const MAX_IMAGE_BASE64_CHARS = 1_500_000

export const analyzeRequestSchema = z.object({
  fileName: text.max(255),
  pages: z.array(z.string()).min(1).max(1000),
  images: z
    .array(
      z.object({
        page: z.number().int().positive(),
        mimeType: z.literal('image/jpeg'),
        data: z.string().min(1).max(MAX_IMAGE_BASE64_CHARS),
      }),
    )
    .max(MAX_OCR_PAGES),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>

// Error body returned by the Worker. The app maps codes to Polish messages.
export const API_ERROR_CODES = [
  'bad_request',
  'forbidden_origin',
  'payload_too_large',
  'rate_limited',
  'ai_quota',
  'ai_unavailable',
  'ai_invalid_response',
  'internal',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  error: z.object({ code: z.enum(API_ERROR_CODES) }),
})
