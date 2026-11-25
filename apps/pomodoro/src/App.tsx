import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  FormGrid,
  MonoLabel,
  Stack,
  TextInput,
} from '@lacuna/ui'
import {
  BREAK_SECONDS,
  loadState,
  saveState,
  loadWorkMinutes,
  saveWorkMinutes,
} from './host'

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function App() {
  const [state, setState] = useState(() => loadState())
  const [workMinutes, setWorkMinutes] = useState(() => loadWorkMinutes())

  useEffect(() => {
    // Persist the state the app should reopen in: a live countdown restarts
    // idle on the next open instead of ticking in the background.
    saveState(state.phase === 'running' ? { ...state, phase: 'idle' } : state)
  }, [state])

  useEffect(() => {
    if (state.phase !== 'running') return
    const id = window.setInterval(() => {
      setState((prev) => {
        if (prev.phase !== 'running') return prev
        if (prev.remainingSeconds <= 0) return prev
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 }
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [state.phase])

  useEffect(() => {
    // An interval that reaches zero while running hands off to the other
    // mode: work ends into a 5-minute break, a break ends into work.
    if (state.phase !== 'running' || state.remainingSeconds > 0) return
    const nextMode = state.mode === 'work' ? 'break' : 'work'
    const nextDuration = nextMode === 'work' ? workMinutes * 60 : BREAK_SECONDS
    setState({ mode: nextMode, phase: 'idle', remainingSeconds: nextDuration })
  }, [state.phase, state.remainingSeconds, workMinutes])

  const startPause = () => {
    if (state.phase === 'running') {
      setState((prev) => ({ ...prev, phase: 'paused' }))
    } else if (state.phase === 'idle' && state.mode === 'work') {
      setState((prev) => ({ ...prev, phase: 'running', remainingSeconds: workMinutes * 60 }))
    } else {
      setState((prev) => ({ ...prev, phase: 'running' }))
    }
  }

  const reset = () => {
    const duration = state.mode === 'work' ? workMinutes * 60 : BREAK_SECONDS
    setState((prev) => ({ ...prev, phase: 'idle', remainingSeconds: duration }))
  }

  const switchMode = () => {
    const nextMode = state.mode === 'work' ? 'break' : 'work'
    const duration = nextMode === 'work' ? workMinutes * 60 : BREAK_SECONDS
    setState({ mode: nextMode, phase: 'idle', remainingSeconds: duration })
  }

  const applyWorkMinutes = (raw: string) => {
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    const clamped = Math.min(120, Math.floor(parsed))
    setWorkMinutes(clamped)
    saveWorkMinutes(clamped)
    setState((prev) => ({
      ...prev,
      remainingSeconds:
        prev.mode === 'work' && prev.phase === 'idle' ? clamped * 60 : prev.remainingSeconds,
    }))
  }

  const displayTime = formatTime(state.remainingSeconds)
  const isRunning = state.phase === 'running'
  const isPaused = state.phase === 'paused'
  const isWork = state.mode === 'work'

  const startLabel = isRunning ? 'Pause' : isPaused ? 'Resume' : 'Start'
  const status = isRunning ? 'Running' : isPaused ? 'Paused' : 'Idle'

  const workDuration = workMinutes * 60
  const progress = isWork
    ? state.remainingSeconds / workDuration
    : state.remainingSeconds / BREAK_SECONDS

  const progressPct = Math.max(0, Math.min(1, 1 - progress)) * 100

  return (
    <AppShell
      name="Pomodoro"
      icon="tasks"
      hue="rust"
      category="Productivity"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'calc(16px * var(--sf))', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 'calc(16px * var(--sf))' }}>
          <Card
            title={isWork ? 'Work' : 'Break'}
            mono={isRunning ? 'RUNNING' : 'IDLE'}
            accent={isRunning}
          >
            <Stack>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 'calc(8px * var(--sf))',
                  padding: 'calc(24px * var(--sf)) 0',
                }}
              >
                <MonoLabel
                  accent={isRunning}
                  style={{ fontSize: 'calc(56px * var(--tf))', lineHeight: 1 }}
                >
                  {displayTime}
                </MonoLabel>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  minHeight: 'calc(16px * var(--sf))',
                }}
              >
                {isPaused ? (
                  <MonoLabel
                    style={{
                      fontSize: 'calc(11px * var(--tf))',
                      letterSpacing: 'calc(2px * var(--sf))',
                      color: 'var(--ink-60)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Paused
                  </MonoLabel>
                ) : null}
              </div>
              <div
                style={{
                  height: 'calc(4px * var(--sf))',
                  background: 'var(--hair)',
                  borderRadius: 0,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: isRunning ? 'var(--ui-accent)' : 'var(--ui-line2)',
                    transition: 'width 1s linear',
                  }}
                />
              </div>
              <Actions>
                <Button kind="primary" ariaLabel={startLabel} onClick={startPause}>
                  {startLabel}
                </Button>
                <Button ariaLabel="Reset" onClick={reset}>
                  Reset
                </Button>
                <Button ariaLabel="Switch" onClick={switchMode}>
                  Switch
                </Button>
              </Actions>
            </Stack>
          </Card>

          <Card title="Work minutes" mono="INTERVAL">
            <FormGrid>
              <TextInput
                label="Work minutes"
                type="number"
                value={String(workMinutes)}
                onChange={applyWorkMinutes}
              />
            </FormGrid>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 'calc(16px * var(--sf))' }}>
          <Card title="How it works" mono="INFO">
            <Stack>
              <Body sm>
                <h3 style={{ margin: 0 }}>Focus blocks</h3>
                <Body sm>
                  Start a work interval and stay on task. When it ends, the timer switches to a
                  5-minute rest automatically.
                </Body>
              </Body>
              <Body sm>
                <h3 style={{ margin: 0 }}>Custom work length</h3>
                <Body sm>
                  Change the work minutes field to suit your rhythm. The rest stays at 5 minutes.
                </Body>
              </Body>
            </Stack>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
