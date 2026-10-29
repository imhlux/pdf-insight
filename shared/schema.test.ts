import { describe, expect, it } from 'vitest'
import { aiResultSchema, analyzeRequestSchema, insightSchema } from './schema'
import { validAiResult, validInsight } from './fixtures'

describe('insightSchema', () => {
  it('accepts the example from the brief', () => {
    expect(insightSchema.safeParse(validInsight).success).toBe(true)
  })

  it('accepts null and empty lists when data is missing', () => {
    const empty = {
      ...validInsight,
      document: { ...validInsight.document, title: null, date: null },
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: [],
    }
    expect(insightSchema.safeParse(empty).success).toBe(true)
  })

  it('rejects a document without fileName', () => {
    const { fileName: _omit, ...document } = validInsight.document
    expect(insightSchema.safeParse({ ...validInsight, document }).success).toBe(false)
  })

  it('rejects an unknown document type', () => {
    const doc = { ...validInsight.document, type: 'list' }
    expect(insightSchema.safeParse({ ...validInsight, document: doc }).success).toBe(false)
  })

  it.each(['01.10.2026', '2026-13-01', '2026/10/01', 'jutro'])(
    'rejects non ISO date %s',
    (date) => {
      const result = aiResultSchema.safeParse({ ...validAiResult, dates: [{ date, context: 'x' }] })
      expect(result.success).toBe(false)
    },
  )

  it.each(['zł', 'pln', 'PLNN', ''])('rejects non ISO 4217 currency %s', (currency) => {
    const amounts = [{ value: 1, currency, context: 'x' }]
    expect(aiResultSchema.safeParse({ ...validAiResult, amounts }).success).toBe(false)
  })

  it('rejects an amount given as a string', () => {
    const amounts = [{ value: '12 500,00', currency: 'PLN', context: 'x' }]
    expect(aiResultSchema.safeParse({ ...validAiResult, amounts }).success).toBe(false)
  })

  it('rejects language that is not ISO 639-1', () => {
    const doc = { ...validAiResult.document, language: 'polish' }
    expect(aiResultSchema.safeParse({ ...validAiResult, document: doc }).success).toBe(false)
  })

  it('requires 3 to 7 key points', () => {
    const tooFew = { ...validAiResult, keyPoints: ['a', 'b'] }
    const tooMany = { ...validAiResult, keyPoints: ['1', '2', '3', '4', '5', '6', '7', '8'] }
    expect(aiResultSchema.safeParse(tooFew).success).toBe(false)
    expect(aiResultSchema.safeParse(tooMany).success).toBe(false)
  })

  it('rejects an empty summary', () => {
    expect(aiResultSchema.safeParse({ ...validAiResult, summary: '  ' }).success).toBe(false)
  })

  it('rejects a result with a required field removed', () => {
    const { keywords: _omit, ...withoutKeywords } = validAiResult
    expect(aiResultSchema.safeParse(withoutKeywords).success).toBe(false)
  })
})

describe('analyzeRequestSchema', () => {
  it('accepts page texts with optional scanned page images', () => {
    const body = {
      fileName: 'a.pdf',
      pages: ['tekst', ''],
      images: [{ page: 2, mimeType: 'image/jpeg', data: 'AAAA' }],
    }
    expect(analyzeRequestSchema.safeParse(body).success).toBe(true)
  })

  it('rejects more than 4 images', () => {
    const image = { page: 1, mimeType: 'image/jpeg', data: 'AAAA' }
    const body = { fileName: 'a.pdf', pages: ['x'], images: Array(5).fill(image) }
    expect(analyzeRequestSchema.safeParse(body).success).toBe(false)
  })
})
