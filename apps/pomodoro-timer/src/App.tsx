// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, Kpi, KpiRow, List, PrimaryButton, Rail, Row } from '@lacuna/ui'
import { computeStreaks } from '@lacuna/streak-calc'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Session } from './host'
import './app.css'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60
type Phase = 'focus' | 'break'
type Tab = 'Timer' | 'History'

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function initialFocusSeconds(): number {
  const raw = new URLSearchParams(window.location.search).get('focus')
  const n = raw === null ? NaN : Number(raw)
  return Number.isFinite(n) && n > 0 ? n : FOCUS_SECONDS
}

export function App() {
  const focusSeconds = useRef(initialFocusSeconds()).current
  const [tab, setTab] = useState<Tab>('Timer')
  const [sessions, setSessions] = useState<Session[]>(() => host.read().sessions)
  const [toast, setToast] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('focus')
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [remaining, setRemaining] = useState(() => focusSeconds)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const completedFocusRef = useRef(false)
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (remaining !== 0 || !running) return
    setRunning(false)
    if (phase === 'focus') {
      recordSession('Focus', focusSeconds)
      setToast('Focus session completed')
      setPhase('break')
      setStarted(false)
      completedFocusRef.current = true
      transitionTimeoutRef.current = window.setTimeout(() => {
        setRemaining(BREAK_SECONDS)
        transitionTimeoutRef.current = null
      }, 400)
    } else {
      setPhase('focus')
      setRemaining(focusSeconds)
      setStarted(false)
      completedFocusRef.current = false
    }
  }, [remaining, running, phase, focusSeconds])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current)
        transitionTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1500)
    return () => window.clearTimeout(id)
  }, [toast])

  const { copy } = useClipboard({
    timeoutMs: 4000,
    onSuccess: () => setToast('Copied to clipboard'),
  })

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

  function handleStart() {
    if (running) {
      setRunning(false)
      return
    }
    if (completedFocusRef.current) {
      completedFocusRef.current = false
      setRemaining(BREAK_SECONDS)
      setStarted(true)
      setRunning(true)
      return
    }
    setStarted(true)
    setRunning(true)
  }

  function handleSkip() {
    const nextPhase: Phase = phase === 'focus' ? 'break' : 'focus'
    setPhase(nextPhase)
    setRemaining(nextPhase === 'focus' ? focusSeconds : BREAK_SECONDS)
    setRunning(false)
    setStarted(false)
    completedFocusRef.current = false
  }

  const focusSessions = sessions.filter((s) => s.phase === 'Focus')
  const today = new Date().toISOString().slice(0, 10)
  const streak = focusSessions.length
    ? computeStreaks(focusSessions.map((s) => s.completedAt.slice(0, 10)), { today }).current
    : 0

  const totalFocus = focusSessions.reduce((sum, s) => sum + s.seconds, 0)

  function copySummary() {
    void copy(`Sessions: ${focusSessions.length}, Total focus: ${fmt(totalFocus)}`)
  }

  const phaseName = phase === 'focus' ? 'Focus' : 'Break'

  return (
    <AppShell
      name="Pomodoro Timer"
      icon="timesheets"
      hue="teal"
      category="Productivity"
      meta="Interval"
      status={toast ?? undefined}
      side={
        <Rail
          title="Streak"
          note="A streak needs one naturally completed interval per day."
          chips={[`${focusSessions.length} sessions`, `${streak} day streak`]}
        />
      }
    >
      <div className="lc-tabs" role="tablist">
        {(['Timer', 'History'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={cx('lc-tab', tab === item && 'active')}
            onClick={() => {
              setTab(item)
              if (item === 'History') setToast(null)
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Timer' && (
        <Card mono="Now" title={phaseName}>
          <KpiRow>
            <Kpi
              value={
                <div data-testid="time" aria-hidden="true">
                  {fmt(remaining)}
                </div>
              }
              label="Time remaining"
              accent
            />
          </KpiRow>
          <Actions>
            <PrimaryButton onClick={handleStart}>
              {running ? 'Pause' : started ? 'Resume' : 'Start'}
            </PrimaryButton>
            <Button onClick={handleSkip}>Skip</Button>
          </Actions>
        </Card>
      )}

      <Card mono="Streak" title="Daily streak">
        <KpiRow>
          <Kpi value={`Streak: ${streak}`} label="Days in a row" />
        </KpiRow>
      </Card>

      {tab === 'History' && (
        <Card mono={`${focusSessions.length} sessions`} title="History">
          {focusSessions.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No sessions yet"
              detail="Complete an interval to see it here."
              actionLabel="Start a session"
              onAction={() => setTab('Timer')}
            />
          ) : (
            <>
              <List label="Sessions">
                {focusSessions.map((s) => (
                  <Row key={s.id} title="Focus" meta={new Date(s.completedAt).toDateString()} value={fmt(s.seconds)} />
                ))}
              </List>
              <Actions>
                <Button onClick={copySummary}>Copy summary</Button>
              </Actions>
            </>
          )}
        </Card>
      )}
    </AppShell>
  )
}
