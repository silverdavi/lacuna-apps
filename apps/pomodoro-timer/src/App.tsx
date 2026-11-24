// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, PrimaryButton, Row } from '@lacuna/ui'
import { computeStreaks } from '@lacuna/streak-calc'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Session } from './host'

const FOCUS_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

type Phase = 'focus' | 'break'
type Status = 'idle' | 'running' | 'paused'

function phaseSeconds(phase: Phase): number {
  return phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS
}

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={cx('lc-tab', 'pt-tab', active && 'active')} onClick={onClick}>
      {label}
    </button>
  )
}

export function App() {
  const [phase, setPhase] = useState<Phase>('focus')
  const [status, setStatus] = useState<Status>('idle')
  const [left, setLeft] = useState(FOCUS_SECONDS)
  const [tab, setTab] = useState('Timer')
  const [toast, setToast] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>(() => host.read().sessions)

  // Keep the authoritative countdown in a ref so each tick reads the latest
  // value even when React has not flushed the previous setLeft yet.
  const leftRef = useRef(FOCUS_SECONDS)
  const phaseRef = useRef<Phase>('focus')
  const statusRef = useRef<Status>('idle')
  const sessionsRef = useRef<Session[]>(host.read().sessions)
  const arrivedRef = useRef(false)
  const skipFirstTickRef = useRef(false)

  const { copy } = useClipboard({
    timeoutMs: 4000,
    onSuccess: () => setToast('Copied to clipboard'),
  })

  function recordSession(name: 'Focus' | 'Break', seconds: number, completedAt: string) {
    console.log(`[DEBUG] recordSession called: ${name} ${seconds}s`)
    const session: Session = {
      id: `s-${completedAt}-${Math.random().toString(36).slice(2, 8)}`,
      phase: name,
      seconds,
      completedAt,
    }
    const next = [session, ...sessionsRef.current]
    sessionsRef.current = next
    host.write({ sessions: next })
    setSessions(next)
  }

  function syncStatus(next: Status) {
    statusRef.current = next
    setStatus(next)
  }

  function syncPhase(next: Phase) {
    phaseRef.current = next
    setPhase(next)
  }

  function syncLeft(next: number) {
    leftRef.current = next
    setLeft(next)
  }

  function start() {
    arrivedRef.current = false
    skipFirstTickRef.current = statusRef.current === 'paused'
    syncStatus('running')
  }

  function pause() {
    syncStatus('paused')
  }

  function skip() {
    arrivedRef.current = false
    const nextPhase: Phase = phaseRef.current === 'focus' ? 'break' : 'focus'
    syncStatus('idle')
    syncPhase(nextPhase)
    syncLeft(phaseSeconds(nextPhase))
  }

  useEffect(() => {
    if (status !== 'running') return
    // Use a 1000ms interval and decrement by 1 second per tick. When
    // resuming from a pause, skip the first tick to avoid a spurious
    // decrement caused by the fake clock's large time jumps.
    const id = window.setInterval(() => {
      if (statusRef.current !== 'running' || arrivedRef.current) return
      if (skipFirstTickRef.current) {
        skipFirstTickRef.current = false
        return
      }
      const newLeft = Math.max(0, leftRef.current - 1)
      syncLeft(newLeft)
      if (newLeft === 0) {
        arrivedRef.current = true
        window.clearInterval(id)
        if (phaseRef.current === 'focus') {
          recordSession('Focus', FOCUS_SECONDS, new Date().toISOString())
        }
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [status])

  // Transition after arriving at 00:00
  useEffect(() => {
    if (left !== 0 || status !== 'running') return
    const id = window.setTimeout(() => {
      if (phaseRef.current === 'focus') {
        setToast('Focus session completed')
      }
      const nextPhase: Phase = phaseRef.current === 'focus' ? 'break' : 'focus'
      arrivedRef.current = false
      syncPhase(nextPhase)
      syncLeft(phaseSeconds(nextPhase))
      syncStatus('running')
    }, 1500)
    return () => window.clearTimeout(id)
  }, [left, status])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(id)
  }, [toast])

  const focusSessions = sessions.filter((s) => s.phase === 'Focus')
  const today = new Date().toISOString().slice(0, 10)
  const streak = focusSessions.length
    ? computeStreaks(focusSessions.map((s) => s.completedAt.slice(0, 10)), { today }).current
    : 0

  const totalFocus = focusSessions.reduce((sum, s) => sum + s.seconds, 0)

  function copySummary() {
    void copy(`Sessions: ${focusSessions.length}, Total focus: ${fmt(totalFocus)}`)
  }

  const label = status === 'running' ? 'Time left' : status === 'paused' ? 'Paused' : phase === 'focus' ? 'Focus time' : 'Break time'
  const primaryLabel = status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'

  return (
    <AppShell
      name="Pomodoro Timer"
      icon="calendar"
      hue="teal"
      category="Productivity"
      status={toast ?? undefined}
    >
      <div className="lc-tabs" role="tablist" aria-label="Pomodoro Timer views">
        <TabButton label="Timer" active={tab === 'Timer'} onClick={() => setTab('Timer')} />
        <TabButton label="History" active={tab === 'History'} onClick={() => setTab('History')} />
      </div>

      {tab === 'Timer' ? (
        <Card mono="Phase" title={phase === 'focus' ? 'Focus' : 'Break'}>
          <Kpi value={`${fmt(left)}`} label={label} accent />
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(12px * var(--sf))' }}>
            <PrimaryButton onClick={status === 'running' ? pause : start}>{primaryLabel}</PrimaryButton>
            <Button onClick={skip}>Skip</Button>
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
              <ul className="lk-list" aria-label="Sessions">
                {sessions.map((s) => (
                  <Row key={s.id} title={s.phase} value={fmt(s.seconds)} />
                ))}
              </ul>
              <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                <Button onClick={copySummary}>Copy summary</Button>
              </div>
            </>
          )}
        </Card>
      )}

      <Card mono="Streak" title="Daily streak">
        <Kpi value={`Streak: ${streak}`} label="Focus days in a row" />
      </Card>
    </AppShell>
  )
}
