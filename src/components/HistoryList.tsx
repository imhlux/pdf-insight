import type { HistoryEntry } from '../lib/history'
import { formatDateTime, typeLabel } from '../lib/format'

interface Props {
  entries: HistoryEntry[]
  onOpen: (entry: HistoryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function HistoryList({ entries, onOpen, onRemove, onClear }: Props) {
  return (
    <section className="panel history" aria-labelledby="history-title">
      <div className="history-header">
        <h2 id="history-title">Ostatnie analizy</h2>
        {entries.length > 0 && (
          <button type="button" className="button ghost small" onClick={onClear}>
            Wyczyść historię
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="muted">
          Brak zapisanych analiz. Wyniki zapisują się tylko w tej przeglądarce.
        </p>
      ) : (
        <ul className="history-list">
          {entries.map((entry) => {
            const { document, analysis } = entry.insight
            const name = document.title ?? document.fileName
            return (
              <li key={entry.id}>
                <button type="button" className="history-open" onClick={() => onOpen(entry)}>
                  <span className="history-name">{name}</span>
                  <span className="muted small">
                    {typeLabel(document.type)} · {document.fileName} ·{' '}
                    {formatDateTime(analysis.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`Usuń z historii: ${name}`}
                >
                  Usuń
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
