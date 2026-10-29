import { useEffect, useReducer, useState } from 'react'
import type { Insight } from '../shared/schema'
import { analyze } from './api/analyze'
import { Dropzone } from './components/Dropzone'
import { ErrorState } from './components/ErrorState'
import { HistoryList } from './components/HistoryList'
import { LoadingState, type LoadingStep } from './components/LoadingState'
import { PrivacyNote } from './components/PrivacyNote'
import { ResultView } from './components/ResultView'
import { toErrorCode, type ErrorCode } from './lib/errors'
import { validatePdfFile } from './lib/file'
import { addToHistory, clearHistory, loadHistory, removeFromHistory } from './lib/history'

// The screen is one of four states. A reducer keeps the transitions in one
// place, so the UI cannot end up "loading" and "error" at the same time.
type State =
  | { status: 'idle' }
  | { status: 'loading'; step: LoadingStep; fileName: string }
  | { status: 'error'; code: ErrorCode; file: File }
  | { status: 'done'; insight: Insight }

type Action =
  | { type: 'start'; fileName: string }
  | { type: 'analyzing' }
  | { type: 'success'; insight: Insight }
  | { type: 'failure'; code: ErrorCode; file: File }
  | { type: 'reset' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { status: 'loading', step: 'reading', fileName: action.fileName }
    case 'analyzing':
      return state.status === 'loading' ? { ...state, step: 'analyzing' } : state
    case 'success':
      return { status: 'done', insight: action.insight }
    case 'failure':
      return { status: 'error', code: action.code, file: action.file }
    case 'reset':
      return { status: 'idle' }
  }
}

export function App() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' })
  const [history, setHistory] = useState(loadHistory)

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

  const run = async (file: File) => {
    dispatch({ type: 'start', fileName: file.name })
    try {
      await validatePdfFile(file)
      // pdf.js is large, so it is loaded only when the first file arrives.
      const { extractPdf } = await import('./lib/pdf')
      const { pages, images } = await extractPdf(file)
      dispatch({ type: 'analyzing' })
      const insight = await analyze({ fileName: file.name, pages, images })
      dispatch({ type: 'success', insight })
      setHistory((entries) => addToHistory(entries, insight))
    } catch (error) {
      dispatch({ type: 'failure', code: toErrorCode(error), file })
    }
  }

  const reset = () => dispatch({ type: 'reset' })

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
        {state.status === 'idle' && (
          <>
            <Dropzone onFile={run} />
            <PrivacyNote />
          </>
        )}

        {state.status === 'loading' && <LoadingState step={state.step} fileName={state.fileName} />}

        {state.status === 'error' && (
          <ErrorState code={state.code} onRetry={() => run(state.file)} onReset={reset} />
        )}

        {state.status === 'done' && <ResultView insight={state.insight} onReset={reset} />}

        {(state.status === 'idle' || state.status === 'done') && (
          <HistoryList
            entries={history}
            onOpen={(entry) => dispatch({ type: 'success', insight: entry.insight })}
            onRemove={(id) => setHistory((entries) => removeFromHistory(entries, id))}
            onClear={() => setHistory(clearHistory())}
          />
        )}
      </main>

      <footer className="app-footer muted small">
        Zadanie rekrutacyjne Vibe Coder · React + TypeScript · Cloudflare Workers · Gemini
      </footer>
    </div>
  )
}
