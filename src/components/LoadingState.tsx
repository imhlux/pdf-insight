import { useEffect, useState } from 'react'

export type LoadingStep = 'reading' | 'analyzing'

interface Props {
  step: LoadingStep
  fileName: string
}

const STEPS: { id: LoadingStep; label: string }[] = [
  { id: 'reading', label: 'Odczyt tekstu z PDF' },
  { id: 'analyzing', label: 'Analiza AI: podsumowanie i dane' },
]

export function LoadingState({ step, fileName }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const currentIndex = STEPS.findIndex((s) => s.id === step)

  return (
    <section className="panel loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <h2>Analizuję plik</h2>
      <p className="muted file-name">{fileName}</p>
      <ol className="steps">
        {STEPS.map((s, index) => (
          <li
            key={s.id}
            className={index < currentIndex ? 'is-done' : index === currentIndex ? 'is-active' : ''}
          >
            {s.label}
          </li>
        ))}
      </ol>
      <p className="muted small">Czas: {seconds} s. Zwykle trwa to 5–20 sekund.</p>
    </section>
  )
}
