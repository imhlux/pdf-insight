import { useEffect, useState } from 'react'
import type { Insight } from '../../shared/schema'
import { downloadJson, jsonFileName } from '../lib/download'

interface Props {
  insight: Insight
}

export function JsonPreview({ insight }: Props) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(insight, null, 2)

  // Hide "Skopiowano" after 2 s. The cleanup stops the timer if the user
  // leaves the view earlier.
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article className="panel json-preview">
      <div className="json-header">
        <h3>{jsonFileName(insight.document.fileName)}</h3>
        <div className="actions">
          <button type="button" className="button small" onClick={copy}>
            {copied ? 'Skopiowano' : 'Kopiuj'}
          </button>
          <button
            type="button"
            className="button small primary"
            onClick={() => downloadJson(insight)}
          >
            Pobierz
          </button>
        </div>
      </div>
      {/* React escapes this text, so content from the PDF cannot inject HTML. */}
      <pre tabIndex={0} aria-label="Wynik w formacie JSON">
        <code>{json}</code>
      </pre>
    </article>
  )
}
