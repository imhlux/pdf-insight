import type { AiResult, Amount, DateEntry } from './schema'

// Cleans up small, predictable deviations in the model output (currency
// written as "zł", duplicates, too many key points) before strict validation.
// Anything that cannot be fixed safely is left as is and fails validation.

const CURRENCY_ALIASES: Record<string, string> = {
  ZŁ: 'PLN',
  ZL: 'PLN',
  PLN: 'PLN',
  '€': 'EUR',
  EURO: 'EUR',
  $: 'USD',
  US$: 'USD',
  '£': 'GBP',
}

export function normalizeCurrency(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const upper = value.trim().toUpperCase()
  return CURRENCY_ALIASES[upper] ?? upper
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

const normalizeKey = (s: string) => s.trim().toLocaleLowerCase().replace(/\s+/g, ' ')

export function dedupeStrings(items: unknown): unknown {
  if (!Array.isArray(items)) return items
  const seen = new Set<string>()
  const result: unknown[] = []
  for (const item of items) {
    if (typeof item !== 'string') {
      result.push(item)
      continue
    }
    const trimmed = item.trim()
    const key = normalizeKey(trimmed)
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const amountKey = (a: unknown) =>
  isRecord(a) ? `${String(a.value)}|${String(a.currency)}|${normalizeKey(String(a.context))}` : ''

const dateKey = (d: unknown) =>
  isRecord(d) ? `${String(d.date)}|${normalizeKey(String(d.context))}` : ''

export function normalizeAiResult(raw: unknown): unknown {
  if (!isRecord(raw)) return raw
  const out: Record<string, unknown> = { ...raw }

  if (isRecord(out.document)) {
    const doc = { ...out.document }
    if (typeof doc.language === 'string') doc.language = doc.language.trim().toLowerCase()
    if (typeof doc.type === 'string') doc.type = doc.type.trim().toLowerCase()
    if (doc.title === '') doc.title = null
    if (doc.date === '') doc.date = null
    out.document = doc
  }

  if (typeof out.summary === 'string') out.summary = out.summary.trim()

  const keyPoints = dedupeStrings(out.keyPoints)
  out.keyPoints = Array.isArray(keyPoints) ? keyPoints.slice(0, 7) : keyPoints
  out.keywords = dedupeStrings(out.keywords)

  if (isRecord(out.entities)) {
    out.entities = {
      ...out.entities,
      organizations: dedupeStrings(out.entities.organizations),
      people: dedupeStrings(out.entities.people),
    }
  }

  if (Array.isArray(out.amounts)) {
    const amounts = out.amounts.map((a: unknown) =>
      isRecord(a) ? { ...a, currency: normalizeCurrency(a.currency) } : a,
    )
    out.amounts = dedupeBy(amounts, amountKey)
  }

  if (Array.isArray(out.dates)) out.dates = dedupeBy(out.dates as unknown[], dateKey)

  return out
}

// Merges partial results of a long document (one per chunk). Lists are
// combined in code, so the model cannot drop or invent items while merging.
export function mergeLists(parts: AiResult[]) {
  const all = <T>(pick: (p: AiResult) => T[]) => parts.flatMap(pick)
  return {
    entities: {
      organizations: dedupeStrings(all((p) => p.entities.organizations)) as string[],
      people: dedupeStrings(all((p) => p.entities.people)) as string[],
    },
    amounts: dedupeBy<Amount>(
      all((p) => p.amounts),
      amountKey,
    ),
    dates: dedupeBy<DateEntry>(
      all((p) => p.dates),
      dateKey,
    ).sort((a, b) => a.date.localeCompare(b.date)),
    keywords: dedupeStrings(all((p) => p.keywords)) as string[],
  }
}
