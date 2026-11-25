import { useCallback, useEffect, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  PrimaryButton,
  Rail,
  Row,
  Tag,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { loadRecord, saveRecord, type Lap, type Session } from './host'

function formatTime(ms: number): string {
  const total = Math.max(0, ms)
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const centis = Math.floor((total % 1000) / 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${minutes}:${pad(seconds)}.${pad(centis)}`
}

function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<Lap[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionName, setSessionName] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const TICK_MS = 1000
  const ADD_PER_TICK = 55000

  const { copy, copied } = useClipboard()

  useEffect(() => {
    const rec = loadRecord()
    setElapsedMs(rec.elapsedMs)
    setLaps(rec.laps)
    setSessions(rec.sessions)
    setRunning(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setElapsedMs((prev) => prev + ADD_PER_TICK)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    saveRecord({ elapsedMs, laps, running, sessions })
  }, [elapsedMs, laps, running, sessions])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1600)
    return () => window.clearTimeout(id)
  }, [toast])

  const start = useCallback(() => {
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
  }, [])

  const lap = useCallback(() => {
    setLaps((prev) => [...prev, { label: `Lap ${prev.length + 1}`, durationMs: elapsedMs }])
  }, [elapsedMs])

  const reset = useCallback(() => {
    setRunning(false)
    setElapsedMs(0)
    setLaps([])
  }, [])

  const copyLaps = useCallback(() => {
    const text = laps.map((l) => `${l.label}\t${formatTime(l.durationMs)}`).join('\n')
    copy(text).catch(() => {})
  }, [laps, copy])

  const saveSession = useCallback(() => {
    const name = sessionName.trim()
    if (name.length === 0) return
    const session: Session = {
      id: crypto.randomUUID(),
      name,
      totalMs: elapsedMs,
      laps: laps.length,
      savedAt: Date.now(),
    }
    setSessions((prev) => [session, ...prev])
    setSessionName('')
    setToast('Session saved')
  }, [sessionName, elapsedMs, laps.length])

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const displayTime = formatTime(elapsedMs)
  const hasData = elapsedMs > 0 || laps.length > 0
  const totalLapMs = laps.length > 0 ? laps[laps.length - 1].durationMs : 0

  const lapItems = laps.map((l, i) => {
    const startMs = i === 0 ? 0 : laps[i - 1].durationMs
    const segmentMs = l.durationMs - startMs
    return { label: l.label, segment: formatTime(segmentMs), total: formatTime(l.durationMs) }
  })

  return (
    <AppShell
      name="Stopwatch App"
      icon="timesheets"
      hue="gold"
      category="productivity"
      meta={running ? 'Running' : 'Paused'}
      status={
        running
          ? 'Running'
          : sessions.length > 0
            ? `Stopped · ${sessions.length} saved ${sessions.length === 1 ? 'session' : 'sessions'}`
            : 'Stopped'
      }
      side={
        <Rail
          title="Sessions"
          note={`${sessions.length} saved`}
          chips={[`${sessions.length} total`, laps.length > 0 ? `${laps.length} laps live` : 'No live laps', 'Centiseconds']}
        >
          {sessions.length === 0 ? (
            <EmptyState
              mono="Sessions"
              title="No saved sessions"
              detail="Start a run, then name it and press Save session."
              actionLabel="Press Save session"
            />
          ) : (
            <List label="Saved sessions">
              {sessions.map((s) => (
                <Row
                  key={s.id}
                  title={s.name}
                  meta={`${formatClock(s.savedAt)} · ${s.laps} laps`}
                  value={formatTime(s.totalMs)}
                  action={
                    <Button kind="danger" ariaLabel={`Delete session ${s.name}`} onClick={() => deleteSession(s.id)}>
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Rail>
      }
    >
      <div className="sw-body">
        <Card mono="Timer">
          <KpiRow>
            <Kpi value={displayTime} label={running ? 'Running' : 'Paused'} accent={running} />
          </KpiRow>
          <div className="sw-controls">
            <PrimaryButton onClick={running ? stop : start}>
              {running ? 'Stop' : 'Start'}
            </PrimaryButton>
            <Button onClick={lap} disabled={!running} ariaLabel="Lap">
              Lap
            </Button>
            <Button onClick={reset} disabled={!hasData} ariaLabel="Reset">
              Reset
            </Button>
            {laps.length >= 2 && (
              <Button onClick={copyLaps} ariaLabel="Copy laps">
                {copied ? 'Copied' : 'Copy laps'}
              </Button>
            )}
          </div>
        </Card>
        <Card
          mono="Session"
          title="Save session"
          actions={
            <Button kind="primary" onClick={saveSession} disabled={sessionName.trim().length === 0 || !hasData} ariaLabel="Save session">
              Save session
            </Button>
          }
        >
          <input
            className="lc-input"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Name this run"
            aria-label="Session name"
          />
          <div className="sw-hint">
            Saves the current total and lap count to the session rail.
            {toast && <Tag accent>{toast}</Tag>}
          </div>
        </Card>
        <Card title="Laps" mono={laps.length > 0 ? `${laps.length} laps` : undefined}>
          {laps.length === 0 ? (
            <EmptyState title="No laps yet" detail="Press Lap while the timer is running." actionLabel="Press Lap" />
          ) : (
            <>
              <List label="Lap breakdown">
                {lapItems.map((l) => (
                  <Row
                    key={l.label}
                    title={l.label}
                    meta={`Segment ${l.segment}`}
                    value={l.total}
                  />
                ))}
              </List>
              {laps.length > 1 && (
                <div className="sw-total">
                  Total {formatTime(laps[laps.length - 1].durationMs)}
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
