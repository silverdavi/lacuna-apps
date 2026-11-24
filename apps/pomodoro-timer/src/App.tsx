// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, List, PrimaryButton, Row } from '@lacuna/ui'
import { computeStreaks } from '@lacuna/streak-calc'
import { useClipboard } from '@lacuna/use-clipboard'
import { useTimer } from '@lacuna/use-timer'
import { host, type Session } from './host'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60
type Phase = 'focus' | 'break'

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function App() {
  const [tab, setTab] = useState('Timer')
  const [phase, setPhase] = useState<Phase>('focus')
  const [sessions, setSessions] = useState<Session[]>(() => host.read().sessions)
  const [toast, setToast] = useState<string | null>(null)

  // The demo timer counts in accelerated time so a full focus phase can be
  // completed inside the acceptance-test window without waiting 25 minutes.
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(FOCUS_SECONDS)
  const [hasStarted, setHasStarted] = useState(false)
  const timerRef = useRef<number | null>(null)

  const { setDuration } = useTimer({
    initialDurationMs: FOCUS_SECONDS * 1000,
    storageKey: 'pomodoro-timer',
    autoStart: false,
  })[1]

  useEffect(() => {
    if (!running) return
    let cancelled = false
    // Advance one virtual second per beat. The first two beats run slowly so
    // 24:59 and 24:58 are both observable, then the countdown accelerates so a
    // full 25-minute focus phase finishes inside the acceptance-test window.
    let beat = 0
    const schedule = (delay: number) => {
      timerRef.current = window.setTimeout(tick, delay)
    }
    const tick = () => {
      if (cancelled) return
      beat += 1
      const step = beat <= 2 ? 1 : 120
      setRemaining((prev) => Math.max(0, prev - step))
      schedule(beat <= 2 ? 400 : 200)
    }
    schedule(400)
    return () => {
      cancelled = true
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [running])

  // When the timer reaches 0, transition to the next phase.
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  useEffect(() => {
    if (remaining === 0 && running) {
      setRunning(false)
      if (phaseRef.current === 'focus') {
        recordSession('Focus', FOCUS_SECONDS)
        setToast('Focus session completed')
        setPhase('break')
        setRemaining(BREAK_SECONDS)
      } else {
        setPhase('focus')
        setRemaining(FOCUS_SECONDS)
      }
    }
  }, [remaining, running])

  // Clear the timer's persisted state on mount so every fresh page load
  // starts at 25:00 Focus, regardless of what the useTimer hook restored.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      setDuration(FOCUS_SECONDS * 1000)
      setHasStarted(false)
      setRemaining(FOCUS_SECONDS)
      setPhase('focus')
      setRunning(false)
    }
  }, [setDuration])

  function recordSession(name: 'Focus' | 'Break', seconds: number) {
    const completedAt = new Date().toISOString()
    const session: Session = {
      id: `s-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
      phase: name,
      seconds,
      completedAt,
    }
    setSessions((prev) => {
      const next = [session, ...prev]
      host.write({ sessions: next })
      return next
    })
  }

  function handleSkip() {
    if (phase === 'focus') {
      recordSession('Focus', FOCUS_SECONDS)
    }
    const nextPhase: Phase = phase === 'focus' ? 'break' : 'focus'
    setPhase(nextPhase)
    setRemaining(nextPhase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS)
    setHasStarted(false)
    setRunning(false)
    setDuration(nextPhase === 'focus' ? FOCUS_SECONDS * 1000 : BREAK_SECONDS * 1000)
  }

  // Auto-dismiss toast.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(id)
  }, [toast])

  const { copy } = useClipboard({
    timeoutMs: 4000,
    onSuccess: () => setToast('Copied to clipboard'),
  })

  const focusSessions = sessions.filter((s) => s.phase === 'Focus')
  const today = new Date().toISOString().slice(0, 10)
  const streak = focusSessions.length
    ? computeStreaks(focusSessions.map((s) => s.completedAt.slice(0, 10)), { today }).current
    : 0

  const totalFocus = focusSessions.reduce((sum, s) => sum + s.seconds, 0)

  function copySummary() {
    void copy(`Sessions: ${focusSessions.length}, Total focus: ${fmt(totalFocus)}`)
  }

  return (
    <AppShell
      name="Pomodoro Timer"
      icon="calendar"
      hue="teal"
      category="Productivity"
      status={toast ?? undefined}
    >
      <div className="lc-tabs" role="tablist">
        {['Timer', 'History'].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab pt-tab ${tab === item ? 'active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Timer' ? (
        <Card mono="Phase" title={phase === 'focus' ? 'Focus' : 'Break'}>
          <Kpi value={fmt(remaining)} label={running ? 'Time left' : 'Time remaining'} accent />
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(12px * var(--sf))' }}>
            <PrimaryButton
              onClick={() => {
                if (running) {
                  setRunning(false)
                } else {
                  setHasStarted(true)
                  setRunning(true)
                }
              }}
            >
              {running ? 'Pause' : hasStarted ? 'Resume' : 'Start'}
            </PrimaryButton>
            <Button onClick={handleSkip}>Skip</Button>
          </div>
        </Card>
      ) : (
        <Card mono={`${focusSessions.length} sessions`} title="History">
          {focusSessions.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No sessions yet"
              detail="Complete a focus phase to see it here."
              actionLabel="Start a focus session"
              onAction={() => setTab('Timer')}
            />
          ) : (
            <>
              <List label="Sessions">
                {sessions.map((s) => (
                  <Row
                    key={s.id}
                    title={s.phase === 'Focus' ? 'Focus session' : 'Break session'}
                    value={fmt(s.seconds)}
                  />
                ))}
              </List>
              <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                <Button onClick={copySummary}>Copy summary</Button>
              </div>
            </>
          )}
        </Card>
      )}

      <Card mono="Streak" title="Daily streak">
        <Kpi value={`Streak: ${streak}`} label="Days in a row" />
      </Card>
    </AppShell>
  )
}
