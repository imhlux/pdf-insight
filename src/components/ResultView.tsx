import { useEffect, useRef, useState } from 'react'
import type { Insight } from '../../shared/schema'
import { downloadJson } from '../lib/download'
import { formatAmount, formatDate, languageLabel, typeLabel } from '../lib/format'
import { JsonPreview } from './JsonPreview'

interface Props {
  insight: Insight
  onReset: () => void
}

type View = 'summary' | 'json'

function Empty() {
  return <p className="muted">Brak w dokumencie.</p>
}

export function ResultView({ insight, onReset }: Props) {
  const [view, setView] = useState<View>('summary')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { document: doc, analysis } = insight

  useEffect(() => headingRef.current?.focus(), [insight])

  return (
    <section className="result" aria-labelledby="result-title">
      <header className="panel result-header">
        <p className="eyebrow">{typeLabel(doc.type)}</p>
        <h2 id="result-title" ref={headingRef} tabIndex={-1}>
          {doc.title ?? doc.fileName}
        </h2>
        <dl className="meta">
          <div>
            <dt>Plik</dt>
            <dd>{doc.fileName}</dd>
          </div>
          <div>
            <dt>Stron</dt>
            <dd>{doc.pages}</dd>
          </div>
          <div>
            <dt>Język</dt>
            <dd>{languageLabel(doc.language)}</dd>
          </div>
          <div>
            <dt>Data dokumentu</dt>
            <dd>{doc.date ? formatDate(doc.date) : 'brak'}</dd>
          </div>
        </dl>
        <div className="actions">
          <button type="button" className="button primary" onClick={() => downloadJson(insight)}>
            Pobierz JSON
          </button>
          <button type="button" className="button" onClick={onReset}>
            Analizuj inny plik
          </button>
        </div>
      </header>

      {analysis.warnings.length > 0 && (
        <div className="panel warnings" role="note">
          <h3>Do sprawdzenia</h3>
          <ul>
            {analysis.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="tabs" role="group" aria-label="Widok wyniku">
        <button type="button" aria-pressed={view === 'summary'} onClick={() => setView('summary')}>
          Wyniki
        </button>
        <button type="button" aria-pressed={view === 'json'} onClick={() => setView('json')}>
          Podgląd JSON
        </button>
      </div>

      {view === 'json' ? (
        <JsonPreview insight={insight} />
      ) : (
        <div className="result-grid">
          <article className="panel span-2">
            <h3>Podsumowanie</h3>
            <p className="summary" lang={doc.language}>
              {insight.summary}
            </p>
          </article>

          <article className="panel span-2">
            <h3>Najważniejsze punkty</h3>
            <ul className="bullets" lang={doc.language}>
              {insight.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <h3>Kwoty</h3>
            {insight.amounts.length === 0 ? (
              <Empty />
            ) : (
              <ul className="rows">
                {insight.amounts.map((amount, i) => (
                  <li key={`${amount.value}-${amount.currency}-${i}`}>
                    <span className="value">{formatAmount(amount.value, amount.currency)}</span>
                    <span className="context">{amount.context}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel">
            <h3>Daty</h3>
            {insight.dates.length === 0 ? (
              <Empty />
            ) : (
              <ul className="rows">
                {insight.dates.map((entry, i) => (
                  <li key={`${entry.date}-${i}`}>
                    <span className="value">{formatDate(entry.date)}</span>
                    <span className="context">{entry.context}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel">
            <h3>Organizacje</h3>
            {insight.entities.organizations.length === 0 ? (
              <Empty />
            ) : (
              <ul className="bullets">
                {insight.entities.organizations.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel">
            <h3>Osoby</h3>
            {insight.entities.people.length === 0 ? (
              <Empty />
            ) : (
              <ul className="bullets">
                {insight.entities.people.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel span-2">
            <h3>Słowa kluczowe</h3>
            {insight.keywords.length === 0 ? (
              <Empty />
            ) : (
              <ul className="chips">
                {insight.keywords.map((keyword) => (
                  <li key={keyword}>{keyword}</li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}

      <p className="muted small analysis-meta">
        Model: {analysis.model} · fragmentów tekstu: {analysis.chunks} · wynik sprawdzony schematem
        przed wyświetleniem
      </p>
    </section>
  )
}
