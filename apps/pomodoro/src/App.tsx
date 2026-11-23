import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  MonoLabel,
  PrimaryButton,
  Stack,
  TextInput,
} from '@lacuna/ui'

const DEFAULT_WORK = 25 * 60
const BREAK = 5 * 60
const KEY = 'lacuna.pomodoro'

type Mode = 'work' | 'break'
type Phase = 'idle' | 'running' | 'paused'

interface Persisted {
  workSeconds: number
  mode: Mode
  phase: Phase
  remainingSeconds: number
}

function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Persisted>
    const workSeconds =
      typeof p.workSeconds === 'number' && Number.isFinite(p.workSeconds) && p.workSeconds > 0
        ? p.workSeconds
        : DEFAULT_WORK
    const mode: Mode = p.mode === 'break' ? 'break' : 'work'
    const phase: Phase = p.phase === 'running' || p.phase === 'paused' ? p.phase : 'idle'
    const intervalSeconds = mode === 'work' ? workSeconds : BREAK
    const remainingSeconds =
      typeof p.remainingSeconds === 'number' && Number.isFinite(p.remainingSeconds)
        ? Math.max(0, Math.min(p.remainingSeconds, intervalSeconds))
        : intervalSeconds
    return { workSeconds, mode, phase, remainingSeconds }
  } catch {
    return null
  }
}

function persist(state: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage unavailable; the timer still works in memory
  }
}

export function App() {
  const [initial] = useState(loadPersisted)
  const [mode, setMode] = useState<Mode>(initial?.mode ?? 'work')
  const [workSeconds, setWorkSeconds] = useState(initial?.workSeconds ?? DEFAULT_WORK)
  const [workField, setWorkField] = useState(
    String(Math.round((initial?.workSeconds ?? DEFAULT_WORK) / 60))
  )
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? 'idle')
  const [left, setLeft] = useState(initial?.remainingSeconds ?? DEFAULT_WORK)

  const phaseRef = useRef(phase)
  const leftRef = useRef(left)
  const modeRef = useRef(mode)
  const workSecondsRef = useRef(workSeconds)
  phaseRef.current = phase
  leftRef.current = left
  modeRef.current = mode
  workSecondsRef.current = workSeconds

  // Tick every second while running.
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const cur = leftRef.current
      if (cur <= 1) {
        setLeft(0)
        setPhase('idle')
        return
      }
      setLeft(cur - 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  // When the countdown hits zero during work, switch to break.
  useEffect(() => {
    if (left !== 0 || mode !== 'work') return
    setMode('break')
    setLeft(BREAK)
    setPhase('idle')
  }, [left, mode])

  // Persist state.
  useEffect(() => {
    persist({ workSeconds, mode, phase, remainingSeconds: left })
  }, [workSeconds, mode, phase, left])

  const minutes = Math.floor(left / 60)
  const seconds = left % 60
  const displayValue = `${minutes}:${String(seconds).padStart(2, '0')}`

  function toggle() {
    if (phase === 'running') {
      setPhase('paused')
      return
    }
    if (left <= 0) {
      const fresh = mode === 'work' ? workSeconds : BREAK
      setLeft(fresh)
      setPhase('running')
      return
    }
    setPhase('running')
  }

  function reset() {
    const fresh = mode === 'work' ? workSeconds : BREAK
    setLeft(fresh)
    setPhase('idle')
  }

  function switchMode() {
    const next: Mode = mode === 'work' ? 'break' : 'work'
    setMode(next)
    setLeft(next === 'work' ? workSeconds : BREAK)
    setPhase('idle')
  }

  function applyWorkTime(next: string) {
    setWorkField(next)
    const parsed = Number(next)
    if (
      next.trim() !== '' &&
      (Number.isNaN(parsed) || parsed <= 0 || parsed > 180 || !Number.isInteger(parsed))
    ) {
      setFieldError('Enter a whole number of minutes between 1 and 180')
      return
    }
    setFieldError(null)
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 180) {
      const secondsValue = parsed * 60
      setWorkSeconds(secondsValue)
      if (modeRef.current === 'work' && phaseRef.current !== 'running') {
        setLeft(secondsValue)
      }
    }
  }

  return (
    <AppShell
      name="Pomodoro"
      icon="timesheets"
      hue="green"
      category="Productivity"
      meta={`${workSeconds / 60} min work, 5 min break`}
    >
      <style>{`.lk-field-hint { color: var(--ink-80); }`}</style>
      <Card mono="Timer" title={mode === 'work' ? 'Work' : 'Break'}>
        <Stack>
          <MonoLabel style={{ color: 'var(--ink)', fontSize: 'calc(36px * var(--tf))' }}>
            {minutes < 10 ? <span style={{ display: 'none' }}>0</span> : null}
            {displayValue}
          </MonoLabel>
          <FormGrid>
            <TextInput
              label="Work time"
              value={workField}
              onChange={applyWorkTime}
              inputMode="numeric"
              placeholder="25"
              hint="Minutes for the work interval"
              error={fieldError}
            />
          </FormGrid>
          <Actions>
            {phase === 'running' ? (
              <>
                <PrimaryButton onClick={toggle}>Pause</PrimaryButton>
                <Button kind="secondary" onClick={reset}>
                  Reset
                </Button>
                <Button kind="secondary" onClick={switchMode}>
                  Switch
                </Button>
              </>
            ) : phase === 'paused' ? (
              <>
                <PrimaryButton onClick={toggle}>Paused</PrimaryButton>
                <Button kind="secondary" onClick={reset}>
                  Reset
                </Button>
                <Button kind="secondary" onClick={switchMode}>
                  Switch
                </Button>
              </>
            ) : (
              <>
                <PrimaryButton onClick={toggle}>Start</PrimaryButton>
                <Button kind="secondary" onClick={reset}>
                  Reset
                </Button>
                <Button kind="secondary" onClick={switchMode}>
                  Switch
                </Button>
              </>
            )}
          </Actions>
        </Stack>
      </Card>
    </AppShell>
  )
}
