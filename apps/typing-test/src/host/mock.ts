export interface TypingTestState {
  passage: string
  typed: string
  elapsedMs: number
  status: 'idle' | 'running' | 'paused' | 'done'
  finishedAt: number | null
  bestWpm: number
}

const KEY = 'lacuna.typing-test.state'

export function loadTestState(): TypingTestState | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TypingTestState
    if (typeof parsed.passage !== 'string' || typeof parsed.bestWpm !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function saveTestState(state: TypingTestState): void {
  window.localStorage.setItem(KEY, JSON.stringify(state))
}
