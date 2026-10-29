import {
  GlobalWorkerOptions,
  InvalidPDFException,
  PasswordException,
  getDocument,
  type PDFPageProxy,
} from 'pdfjs-dist'
// "?url" makes Vite copy the worker into the build and return its final URL,
// including the /pdf-insight/ base path used on GitHub Pages.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { MAX_IMAGE_BASE64_CHARS, MAX_OCR_PAGES, type AnalyzeRequest } from '../../shared/schema'
import { AppError } from './errors'

GlobalWorkerOptions.workerSrc = workerUrl

// A page with less visible text than this is treated as a scan.
const MIN_TEXT_CHARS = 20
const OCR_TARGET_WIDTH = 1400

export interface ExtractedPdf {
  pages: string[]
  images: AnalyzeRequest['images']
}

// pdf.js returns text in small pieces with coordinates. Pieces on the same
// line are joined, with a space only where there is a visible gap, so words
// like "Załącznik" are not split into "Za łą cznik".
async function pageText(page: PDFPageProxy): Promise<string> {
  const content = await page.getTextContent()
  let text = ''
  let prev: { y: number; end: number } | null = null

  for (const item of content.items) {
    if (!('str' in item)) continue
    const x = item.transform[4] ?? 0
    const y = item.transform[5] ?? 0
    if (prev) {
      if (Math.abs(y - prev.y) > 2) text += '\n'
      else if (x - prev.end > (item.height || 10) * 0.15 && !text.endsWith(' ')) text += ' '
    }
    text += item.str
    prev = { y, end: x + item.width }
  }
  return text.trim()
}

async function renderPageToJpeg(page: PDFPageProxy): Promise<string> {
  const baseViewport = page.getViewport({ scale: 1 })
  const scale = Math.min(2, OCR_TARGET_WIDTH / baseViewport.width)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, viewport }).promise

  // Lower the quality until the image fits the API limit.
  for (const quality of [0.8, 0.6, 0.4]) {
    const data = canvas.toDataURL('image/jpeg', quality).split(',')[1] ?? ''
    if (data.length <= MAX_IMAGE_BASE64_CHARS) return data
  }
  return ''
}

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data })

  try {
    const pdf = await loadingTask.promise
    const pages: string[] = []
    const images: ExtractedPdf['images'] = []

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n)
      const text = await pageText(page)
      const isScan = text.replace(/\s/g, '').length < MIN_TEXT_CHARS
      pages.push(isScan ? '' : text)

      if (isScan && images.length < MAX_OCR_PAGES) {
        const image = await renderPageToJpeg(page)
        if (image) images.push({ page: n, mimeType: 'image/jpeg', data: image })
      }
      page.cleanup()
    }

    if (pages.every((p) => !p) && images.length === 0) throw new AppError('no_text')
    return { pages, images }
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof PasswordException) throw new AppError('pdf_password')
    if (error instanceof InvalidPDFException) throw new AppError('pdf_invalid')
    throw new AppError('pdf_invalid')
  } finally {
    await loadingTask.destroy()
  }
}
