import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateJson } from './gemini'

const options = {
  apiKey: 'test',
  models: ['model-a', 'model-b', 'model-c'],
  system: 'system',
  contents: [],
  jsonSchema: {},
}

const ok = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }))

// A request that never answers until it is aborted.
const hang = (init: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })

type Handler = (init: RequestInit) => Promise<Response> | Response

function mockModels(handlers: Record<string, Handler>) {
  const calls: string[] = []
  const signals: Record<string, AbortSignal | null | undefined> = {}
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    const model = url.split('/models/')[1]?.split(':')[0] ?? ''
    calls.push(model)
    signals[model] = init.signal
    const handler = handlers[model]
    return handler ? Promise.resolve(handler(init)) : Promise.reject(new Error('unexpected'))
  })
  return { calls, signals }
}

describe('generateJson', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('uses only the first model when it answers', async () => {
    const { calls } = mockModels({ 'model-a': () => ok('{"a":1}') })
    await expect(generateJson(options)).resolves.toEqual({ text: '{"a":1}', model: 'model-a' })
    expect(calls).toEqual(['model-a'])
  })

  it('moves to the next model right away when one is overloaded', async () => {
    const { calls } = mockModels({
      'model-a': () => new Response('busy', { status: 503 }),
      'model-b': () => ok('{"b":1}'),
    })
    await expect(generateJson(options)).resolves.toMatchObject({ model: 'model-b' })
    expect(calls).toEqual(['model-a', 'model-b'])
  })

  it('starts a parallel request when a model hangs and cancels the loser', async () => {
    const { calls, signals } = mockModels({ 'model-a': hang, 'model-b': () => ok('{"b":1}') })
    const result = generateJson(options)

    await vi.advanceTimersByTimeAsync(11_999)
    expect(calls).toEqual(['model-a'])

    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toMatchObject({ model: 'model-b' })
    expect(signals['model-a']?.aborted).toBe(true)
  })

  it('stops at once on an error another model cannot fix', async () => {
    const { calls } = mockModels({ 'model-a': () => new Response('bad key', { status: 403 }) })
    await expect(generateJson(options)).rejects.toMatchObject({ code: 'ai_unavailable' })
    expect(calls).toEqual(['model-a'])
  })

  it('reports the quota error when every model is out of quota', async () => {
    const quota = () => new Response('quota', { status: 429 })
    const { calls } = mockModels({ 'model-a': quota, 'model-b': quota, 'model-c': quota })
    await expect(generateJson(options)).rejects.toMatchObject({ code: 'ai_quota', status: 429 })
    expect(calls).toEqual(['model-a', 'model-b', 'model-c'])
  })
})
