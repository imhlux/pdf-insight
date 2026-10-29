import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Insight } from '../../shared/schema'
import { analyze } from '../api/analyze'
import { analysisReducer, initialState } from '../lib/analysisReducer'
import { toErrorCode } from '../lib/errors'
import { validatePdfFile } from '../lib/file'

// The whole "file -> text -> AI -> result" flow, kept out of the components.
// Components only get the current state and three actions: run, reset, show.
export function useAnalysis(onSuccess: (insight: Insight) => void) {
  const [state, dispatch] = useReducer(analysisReducer, initialState)
  // The controller of the analysis in progress. A ref, because changing it
  // must not re-render the screen.
  const controllerRef = useRef<AbortController | null>(null)

  // Stop a running request when the component disappears.
  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = useCallback(
    async (file: File) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const { signal } = controller

      dispatch({ type: 'start', fileName: file.name })
      try {
        await validatePdfFile(file)
        // pdf.js is large, so it is loaded only when the first file arrives.
        const { extractPdf } = await import('../lib/pdf')
        const { pages, images } = await extractPdf(file)
        signal.throwIfAborted()

        dispatch({ type: 'analyzing' })
        const insight = await analyze({ fileName: file.name, pages, images }, signal)
        dispatch({ type: 'success', insight })
        onSuccess(insight)
      } catch (error) {
        // Cancelled by the user: the screen was already reset in reset().
        if (signal.aborted) return
        dispatch({ type: 'failure', code: toErrorCode(error), file })
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [onSuccess],
  )

  // Used both for "Anuluj" during loading and for "choose another file".
  const reset = useCallback(() => {
    controllerRef.current?.abort()
    dispatch({ type: 'reset' })
  }, [])

  const show = useCallback((insight: Insight) => dispatch({ type: 'success', insight }), [])

  return { state, run, reset, show }
}
