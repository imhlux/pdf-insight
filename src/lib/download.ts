import type { Insight } from '../../shared/schema'

export function jsonFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._-]+/gu, '_') || 'dokument'
  return `${base}.insight.json`
}

export function downloadJson(insight: Insight): void {
  const blob = new Blob([JSON.stringify(insight, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = jsonFileName(insight.document.fileName)
  document.body.append(link)
  link.click()
  link.remove()
  // Revoking right after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
