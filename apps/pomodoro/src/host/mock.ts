import { createMockValue } from '@lacuna/host-mock'

export type Mode = 'work' | 'break'
export type Phase = 'idle' | 'running' | 'paused'

export interface PomodoroState {
  mode: Mode
  phase: Phase
  remainingSeconds: number
}

export const BREAK_SECONDS = 5 * 60

function isPomodoroState(v: unknown): v is PomodoroState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    (s.mode === 'work' || s.mode === 'break') &&
    (s.phase === 'idle' || s.phase === 'running' || s.phase === 'paused') &&
    typeof s.remainingSeconds === 'number' &&
    Number.isFinite(s.remainingSeconds) &&
    s.remainingSeconds >= 0
  )
}

const stateStore = createMockValue<PomodoroState>({
  key: 'lacuna.pomodoro.state.v1',
  fallback: { mode: 'work', phase: 'idle', remainingSeconds: 25 * 60 },
  validate: isPomodoroState,
})

export function loadState(): PomodoroState {
  return stateStore.get()
}

export function saveState(state: PomodoroState): void {
  stateStore.set(state)
}

const WORK_MINUTES_MIN = 1
const WORK_MINUTES_MAX = 120
const WORK_MINUTES_DEFAULT = 25

function isWorkMinutes(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isInteger(v) &&
    v >= WORK_MINUTES_MIN &&
    v <= WORK_MINUTES_MAX
  )
}

const workMinutesStore = createMockValue<number>({
  key: 'lacuna.pomodoro.work-minutes.v1',
  fallback: WORK_MINUTES_DEFAULT,
  validate: isWorkMinutes,
})

export function loadWorkMinutes(): number {
  return workMinutesStore.get()
}

export function saveWorkMinutes(minutes: number): void {
  workMinutesStore.set(Math.floor(minutes))
}
