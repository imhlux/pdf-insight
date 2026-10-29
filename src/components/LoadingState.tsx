import { useEffect, useState } from 'react'
import type { LoadingStep } from '../lib/analysisReducer'

interface Props {
  step: LoadingStep
  fileName: string
  onCancel: () => void
}

const STEPS: { id: LoadingStep; label: string }[] = [
  { id: 'reading', label: 'Odczyt tekstu z PDF' },
  { id: 'analyzing', label: 'Analiza AI: podsumowanie i dane' },
]

export function LoadingState({ step, fileName, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <section className="panel loading" aria-busy="true">
      <div className="spinner" aria-hidden="true" />
      {/* Only the step change is announced. The timer stays outside the live
          region, otherwise a screen reader would read it every second. */}
      <div role="status" aria-live="polite">
        <h2>Analizuję plik</h2>
        <p className="muted file-name">{fileName}</p>
        <ol className="steps">
          {STEPS.map((s, index) => (
            <li
              key={s.id}
              className={
                index < currentIndex ? 'is-done' : index === currentIndex ? 'is-active' : ''
              }
            >
              {s.label}
            </li>
          ))}
        </ol>
      </div>
      <p className="muted small">Czas: {seconds} s. Zwykle trwa to 5–20 sekund.</p>
      <button type="button" className="button" onClick={onCancel}>
        Anuluj
      </button>
    </section>
  )
}
