import { useCallback, useEffect, useState } from 'react'
import type { Insight } from '../shared/schema'
import { Dropzone } from './components/Dropzone'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorState } from './components/ErrorState'
import { HistoryList } from './components/HistoryList'
import { LoadingState } from './components/LoadingState'
import { PrivacyNote } from './components/PrivacyNote'
import { ResultView } from './components/ResultView'
import { useAnalysis } from './hooks/useAnalysis'
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './lib/history'

export function App() {
  const [history, setHistory] = useState(loadHistory)
  const saveToHistory = useCallback(
    (insight: Insight) => setHistory((entries) => addToHistory(entries, insight)),
    [],
  )
  const { state, run, reset, show } = useAnalysis(saveToHistory)

  // A file dropped outside the drop zone would make the browser open it and
  // leave the app. Block that default behaviour for the whole window.
  useEffect(() => {
    const prevent = (event: DragEvent) => event.preventDefault()
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">PDF → podsumowanie → JSON</p>
        <h1>PDF Insight</h1>
        <p className="lead">
          Wgraj plik PDF, a w kilkanaście sekund zobaczysz krótkie podsumowanie, najważniejsze dane
          i pobierzesz je jako JSON.
        </p>
      </header>

      <main>
        <ErrorBoundary>
          {state.status === 'idle' && (
            <>
              <Dropzone onFile={run} />
              <PrivacyNote />
            </>
          )}

          {state.status === 'loading' && (
            <LoadingState step={state.step} fileName={state.fileName} onCancel={reset} />
          )}

          {state.status === 'error' && (
            <ErrorState code={state.code} onRetry={() => run(state.file)} onReset={reset} />
          )}

          {state.status === 'done' && <ResultView insight={state.insight} onReset={reset} />}

          {(state.status === 'idle' || state.status === 'done') && (
            <HistoryList
              entries={history}
              onOpen={(entry) => show(entry.insight)}
              onRemove={(id) => setHistory((entries) => removeFromHistory(entries, id))}
              onClear={() => setHistory(clearHistory())}
            />
          )}
        </ErrorBoundary>
      </main>

      <footer className="app-footer muted small">
        Zadanie rekrutacyjne Vibe Coder · React + TypeScript · Cloudflare Workers · Gemini
      </footer>
    </div>
  )
}
