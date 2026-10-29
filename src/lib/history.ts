import { z } from 'zod'
import { insightSchema, type Insight } from '../../shared/schema'

// Last analyses kept in localStorage. Storage can be full, disabled or edited
// by hand, so every read is validated and every access is wrapped in try/catch.

const STORAGE_KEY = 'pdf-insight:history:v1'
export const HISTORY_LIMIT = 10

const entrySchema = z.object({ id: z.string(), insight: insightSchema })
export type HistoryEntry = z.infer<typeof entrySchema>

export function loadHistory(): HistoryEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.flatMap((item) => {
      const parsed = entrySchema.safeParse(item)
      return parsed.success ? [parsed.data] : []
    })
  } catch {
    return []
  }
}

function persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage full or blocked: history is a convenience, the app works without it.
  }
}

export function addToHistory(entries: HistoryEntry[], insight: Insight): HistoryEntry[] {
  const next = [{ id: crypto.randomUUID(), insight }, ...entries].slice(0, HISTORY_LIMIT)
  persist(next)
  return next
}

export function removeFromHistory(entries: HistoryEntry[], id: string): HistoryEntry[] {
  const next = entries.filter((entry) => entry.id !== id)
  persist(next)
  return next
}

export function clearHistory(): HistoryEntry[] {
  persist([])
  return []
}
