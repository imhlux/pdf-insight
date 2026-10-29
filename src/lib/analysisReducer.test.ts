import { describe, expect, it } from 'vitest'
import { validInsight } from '../../shared/fixtures'
import { analysisReducer, initialState, type AnalysisState } from './analysisReducer'

const file = new File(['%PDF-1.7'], 'umowa.pdf', { type: 'application/pdf' })
const loading: AnalysisState = { status: 'loading', step: 'reading', fileName: 'umowa.pdf' }

describe('analysisReducer', () => {
  it('starts in the empty (idle) state', () => {
    expect(initialState).toEqual({ status: 'idle' })
  })

  it('goes from idle to loading on start', () => {
    expect(analysisReducer(initialState, { type: 'start', fileName: 'umowa.pdf' })).toEqual(loading)
  })

  it('moves to the analyzing step only while loading', () => {
    expect(analysisReducer(loading, { type: 'analyzing' })).toEqual({
      ...loading,
      step: 'analyzing',
    })
    expect(analysisReducer(initialState, { type: 'analyzing' })).toBe(initialState)
  })

  it('shows the result on success', () => {
    expect(analysisReducer(loading, { type: 'success', insight: validInsight })).toEqual({
      status: 'done',
      insight: validInsight,
    })
  })

  it('keeps the file on failure so the user can retry', () => {
    const next = analysisReducer(loading, { type: 'failure', code: 'ai_unavailable', file })
    expect(next).toEqual({ status: 'error', code: 'ai_unavailable', file })
  })

  it('returns to idle on reset from any state', () => {
    const error: AnalysisState = { status: 'error', code: 'timeout', file }
    expect(analysisReducer(error, { type: 'reset' })).toEqual(initialState)
    expect(analysisReducer(loading, { type: 'reset' })).toEqual(initialState)
  })
})
