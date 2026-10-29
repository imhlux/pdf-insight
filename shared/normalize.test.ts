import { describe, expect, it } from 'vitest'
import { mergeLists, normalizeAiResult, normalizeCurrency } from './normalize'
import { aiResultSchema } from './schema'
import { validAiResult } from './fixtures'

describe('normalizeCurrency', () => {
  it.each([
    ['zł', 'PLN'],
    [' pln ', 'PLN'],
    ['€', 'EUR'],
    ['$', 'USD'],
    ['eur', 'EUR'],
  ])('maps %s to %s', (input, expected) => {
    expect(normalizeCurrency(input)).toBe(expected)
  })
})

describe('normalizeAiResult', () => {
  it('turns fixable model output into a valid result', () => {
    const raw = {
      ...validAiResult,
      document: { ...validAiResult.document, language: 'PL', title: '' },
      keyPoints: ['a', 'A ', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      amounts: [
        { value: 100, currency: 'zł', context: 'opłata' },
        { value: 100, currency: 'PLN', context: 'Opłata' },
      ],
    }
    const result = aiResultSchema.parse(normalizeAiResult(raw))
    expect(result.document.language).toBe('pl')
    expect(result.document.title).toBeNull()
    expect(result.keyPoints).toHaveLength(7)
    expect(result.amounts).toEqual([{ value: 100, currency: 'PLN', context: 'opłata' }])
  })

  it('leaves unfixable output invalid', () => {
    expect(aiResultSchema.safeParse(normalizeAiResult({ summary: 'x' })).success).toBe(false)
    expect(normalizeAiResult('not json')).toBe('not json')
  })
})

describe('mergeLists', () => {
  it('combines chunk results without duplicates and sorts dates', () => {
    const second = {
      ...validAiResult,
      entities: { organizations: ['przykład sp. z o.o.', 'Inna S.A.'], people: ['Jan Kowalski'] },
      dates: [{ date: '2026-01-05', context: 'start' }],
    }
    const merged = mergeLists([validAiResult, second])
    expect(merged.entities.organizations).toEqual(['Przykład sp. z o.o.', 'Inna S.A.'])
    expect(merged.entities.people).toEqual(['Jan Kowalski'])
    expect(merged.amounts).toHaveLength(1)
    expect(merged.dates.map((d) => d.date)).toEqual(['2026-01-05', '2026-10-01'])
  })
})
