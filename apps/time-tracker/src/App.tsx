// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, TextInput } from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { host, type Session } from './host'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function App() {
  const [tab, setTab] = useState<'Timer' | 'History'>('Timer')
  const [sessions, setSessions] = useState<Session[]>(() => host.read().sessions)
  const [running, setRunning] = useState(false)
  const [task, setTask] = useState('')
  const [elapsedMs, setElapsedMs] = useState(0)
  const runningRef = useRef(false)
  const startRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!running) {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
      return
    }
    runningRef.current = true
    setElapsedMs(0)
    startRef.current = performance.now()
    const tick = () => {
      if (!runningRef.current) return
      setElapsedMs(performance.now() - startRef.current)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  const totalMs = sessions.reduce((sum, s) => sum + s.durationMs, 0)

  function start() {
    setRunning(true)
  }

  function stop() {
    // elapsedMs is the last driven tick, so stop reads the live value rather
    // than re-deriving it from the (possibly paused) clock at click time.
    const durationMs = Math.round(elapsedMs)
    setRunning(false)
    setElapsedMs(0)
    if (durationMs > 0) {
      const next = host.addSession(task, durationMs)
      setSessions(next.sessions)
    }
    setTask('')
  }

  function remove(id: string) {
    const next = host.removeSession(id)
    setSessions(next.sessions)
  }

  function exportCsv() {
    const rows = [
      ['Task', 'Duration'],
      ...sessions.map((s) => [s.task, formatMs(s.durationMs)]),
    ]
    const blob = new Blob([toCsv(rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'time-tracker.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell name="Time Tracker" icon="timesheets" hue="rust" category="Productivity" meta={running ? 'timing' : undefined} status={running ? 'Timer running' : 'Idle'}>
      <div role="tablist" className="lc-tabs" aria-label="Time Tracker sections">
        {(['Timer', 'History'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`tt-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === 'Timer' && (
        <Card>
          <div style={{ display: 'grid', gap: 'calc(16px * var(--sf))' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(44px * var(--tf))', lineHeight: 1, color: 'var(--ink)' }}>
              {formatMs(elapsedMs)}
            </div>
            <TextInput
              label="Task Name"
              value={task}
              placeholder="Default Task"
              onChange={(value) => setTask(value)}
            />
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              {running ? (
                <Button kind="danger" onClick={stop}>
                  Stop Timer
                </Button>
              ) : (
                <Button kind="primary" onClick={start}>
                  Start Timer
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
      <Card>
        <table className="lc-table" aria-label="Session history">
          <thead>
            <tr>
              <th>Task</th>
              <th className="num">Duration</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                    <span>{s.task}</span>
                    <Button kind="ghost" onClick={() => remove(s.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
                <td className="num">{formatMs(s.durationMs)}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={2} className="lc-faint" style={{ color: 'var(--ink-60)' }}>
                  No sessions yet. Start the timer and stop it to log your first one.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="col">Total</th>
              <td className="num">
                <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
                  Total{' '}
                </span>
                {formatMs(totalMs)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button kind="secondary" onClick={exportCsv} disabled={sessions.length === 0}>
          Export CSV
        </Button>
      </div>
    </AppShell>
  )
}
