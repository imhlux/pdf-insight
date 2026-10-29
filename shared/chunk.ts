// Splits page texts into chunks small enough for one model call.
// Pages stay whole when possible and keep a "[Strona N]" marker, so the model
// and the merge step still know where each fragment came from.

export const DEFAULT_CHUNK_CHARS = 60_000

export function chunkPages(pages: string[], maxChars = DEFAULT_CHUNK_CHARS): string[] {
  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  pages.forEach((pageText, index) => {
    const text = pageText.trim()
    if (!text) return
    const block = `[Strona ${index + 1}]\n${text}\n\n`

    if (block.length > maxChars) {
      flush()
      for (let start = 0; start < block.length; start += maxChars) {
        chunks.push(block.slice(start, start + maxChars).trim())
      }
      return
    }

    if (current.length + block.length > maxChars) flush()
    current += block
  })

  flush()
  return chunks
}
