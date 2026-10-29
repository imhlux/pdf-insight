import { describe, expect, it } from 'vitest'
import { chunkPages } from './chunk'

describe('chunkPages', () => {
  it('keeps a short document in one chunk with page markers', () => {
    const chunks = chunkPages(['pierwsza', 'druga'])
    expect(chunks).toEqual(['[Strona 1]\npierwsza\n\n[Strona 2]\ndruga'])
  })

  it('skips empty pages but keeps original page numbers', () => {
    expect(chunkPages(['a', '  ', 'c'])).toEqual(['[Strona 1]\na\n\n[Strona 3]\nc'])
  })

  it('splits pages into several chunks under the limit', () => {
    const page = 'x'.repeat(40)
    const chunks = chunkPages([page, page, page], 120)
    expect(chunks).toHaveLength(2)
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(120))
  })

  it('cuts a single huge page into pieces', () => {
    const chunks = chunkPages(['y'.repeat(250)], 100)
    expect(chunks.length).toBe(3)
  })

  it('returns no chunks for a document without text', () => {
    expect(chunkPages(['', ' \n '])).toEqual([])
  })
})
