import { createMockValue } from '@lacuna/host-mock'

export interface TypingTestState {
  passage: string
  typed: string
  elapsedMs: number
  status: 'idle' | 'running' | 'paused' | 'done'
  finishedAt: number | null
  bestWpm: number
}

const KEY = 'lacuna.typing-test.state'

function isState(v: unknown): v is TypingTestState {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.passage === 'string' && typeof r.bestWpm === 'number'
}

const store = createMockValue<TypingTestState | null>({ key: KEY, fallback: null, validate: isState })

export function loadTestState(): TypingTestState | null {
  return store.get()
}

export function saveTestState(state: TypingTestState): void {
  store.set(state)
}
