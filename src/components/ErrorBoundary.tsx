import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Catches errors thrown while rendering, so a bug shows a message instead of
// a blank page. React has no hook for this yet, so it must be a class.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <section className="panel error" role="alert">
        <h2>Coś poszło nie tak</h2>
        <p>Nie udało się wyświetlić tego widoku. Odśwież stronę i spróbuj ponownie.</p>
        <div className="actions">
          <button type="button" className="button primary" onClick={() => window.location.reload()}>
            Odśwież stronę
          </button>
        </div>
      </section>
    )
  }
}
