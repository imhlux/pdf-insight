import { AppError } from './errors'

export const MAX_FILE_BYTES = 10 * 1024 * 1024

// Checks the extension/MIME type, the size and the "%PDF-" signature.
// The signature check catches files that were only renamed to .pdf.
export async function validatePdfFile(file: File): Promise<void> {
  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!looksLikePdf) throw new AppError('file_type')
  if (file.size === 0) throw new AppError('file_empty')
  if (file.size > MAX_FILE_BYTES) throw new AppError('file_size')

  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  const text = new TextDecoder('latin1').decode(head)
  if (!text.includes('%PDF-')) throw new AppError('file_type')
}
