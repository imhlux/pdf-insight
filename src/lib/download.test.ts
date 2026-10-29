import { describe, expect, it } from 'vitest'
import { jsonFileName } from './download'

describe('jsonFileName', () => {
  it('replaces the .pdf extension', () => {
    expect(jsonFileName('Umowa 14-2026.PDF')).toBe('Umowa_14-2026.insight.json')
  })

  it('keeps Polish letters', () => {
    expect(jsonFileName('Załącznik.pdf')).toBe('Załącznik.insight.json')
  })
})
