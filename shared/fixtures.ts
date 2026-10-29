import type { AiResult, Insight } from './schema'

export const validAiResult: AiResult = {
  document: { language: 'pl', type: 'umowa', title: 'Umowa serwisowa', date: '2026-09-01' },
  summary: 'Umowa określa zasady serwisu. Obowiązuje 12 miesięcy. Wynagrodzenie płatne co miesiąc.',
  keyPoints: ['Okres umowy 12 mies.', 'Płatność w 14 dni', 'SLA 99,5%'],
  entities: { organizations: ['Przykład sp. z o.o.'], people: [] },
  amounts: [{ value: 12500, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [{ date: '2026-10-01', context: 'termin płatności' }],
  keywords: ['serwis', 'SLA'],
}

export const validInsight: Insight = {
  ...validAiResult,
  document: { ...validAiResult.document, fileName: 'umowa.pdf', pages: 4 },
  analysis: {
    model: 'test-model',
    chunks: 1,
    ocrPages: [],
    warnings: [],
    createdAt: '2026-10-29T12:00:00.000Z',
  },
}
