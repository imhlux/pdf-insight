import { useEffect, useRef } from 'react'
import { errorMessage, isRetryable, type ErrorCode } from '../lib/errors'

interface Props {
  code: ErrorCode
  onRetry: () => void
  onReset: () => void
}

export function ErrorState({ code, onRetry, onReset }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const retryable = isRetryable(code)

  useEffect(() => headingRef.current?.focus(), [])

  return (
    <section className="panel error" role="alert">
      <h2 ref={headingRef} tabIndex={-1}>
        Nie udało się przeanalizować pliku
      </h2>
      <p>{errorMessage(code)}</p>
      <div className="actions">
        {retryable && (
          <button type="button" className="button primary" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
        <button type="button" className={`button${retryable ? '' : ' primary'}`} onClick={onReset}>
          Wybierz inny plik
        </button>
      </div>
    </section>
  )
}
