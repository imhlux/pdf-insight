import type { Insight } from '../../shared/schema'
import type { ErrorCode } from './errors'

export type LoadingStep = 'reading' | 'analyzing'

// The screen is one of four states. A reducer keeps the transitions in one
// place, so the UI cannot end up "loading" and "error" at the same time.
export type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading'; step: LoadingStep; fileName: string }
  | { status: 'error'; code: ErrorCode; file: File }
  | { status: 'done'; insight: Insight }

export type AnalysisAction =
  | { type: 'start'; fileName: string }
  | { type: 'analyzing' }
  | { type: 'success'; insight: Insight }
  | { type: 'failure'; code: ErrorCode; file: File }
  | { type: 'reset' }

export const initialState: AnalysisState = { status: 'idle' }

export function analysisReducer(state: AnalysisState, action: AnalysisAction): AnalysisState {
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
      return initialState
  }
}
