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
  link.click()
  URL.revokeObjectURL(url)
}
