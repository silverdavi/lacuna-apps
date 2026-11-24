import { useCallback, useEffect, useState } from 'react'
import { AppShell, Card, Kpi, KpiRow, List, Row, Button, EmptyState, PrimaryButton } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { loadRecord, saveRecord, clearRecord, type Lap } from './host'

function formatTime(ms: number): string {
  const total = Math.max(0, ms)
  const minutes = Math.floor(total / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  const centis = Math.floor((total % 1000) / 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${minutes}:${pad(seconds)}.${pad(centis)}`
}

export default function App() {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<Lap[]>([])
  const TICK_MS = 1000
  const ADD_PER_TICK = 55000

  const { copy, copied } = useClipboard()

  useEffect(() => {
    const rec = loadRecord()
    if (rec) {
      setElapsedMs(rec.elapsedMs)
      setLaps(rec.laps)
      setRunning(false)
    }
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
    saveRecord({ elapsedMs, laps, running })
  }, [elapsedMs, laps, running])

  const start = useCallback(() => {
    setRunning(true)
  }, [])

  const stop = useCallback(() => {
    setRunning(false)
  }, [])

  const lap = useCallback(() => {
    setLaps((prev) => [
      ...prev,
      { label: `Lap ${prev.length + 1}`, durationMs: elapsedMs },
    ])
  }, [elapsedMs])

  const reset = useCallback(() => {
    setRunning(false)
    setElapsedMs(0)
    setLaps([])
    clearRecord()
  }, [])

  const copyLaps = useCallback(() => {
    const text = laps.map((l) => `${l.label}\t${formatTime(l.durationMs)}`).join('\n')
    copy(text).catch(() => {})
  }, [laps, copy])

  const displayTime = formatTime(elapsedMs)

  return (
    <AppShell
      name="Stopwatch App"
      icon="timesheets"
      hue="gold"
      category="productivity"
      meta={running ? 'Running' : 'Paused'}
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
            <Button onClick={reset} disabled={elapsedMs === 0 && laps.length === 0} ariaLabel="Reset">
              Reset
            </Button>
            {laps.length >= 2 && (
              <Button onClick={copyLaps} ariaLabel="Copy laps">
                {copied ? 'Copied' : 'Copy laps'}
              </Button>
            )}
          </div>
        </Card>
        <Card title="Laps" mono={laps.length > 0 ? `${laps.length} laps` : undefined}>
          {laps.length === 0 ? (
            <EmptyState title="No laps yet" detail="Press Lap while the timer is running." actionLabel="Press Lap" />
          ) : (
            <List label="Laps">
              {laps.map((l) => (
                <Row key={l.label} title={l.label} value={formatTime(l.durationMs)} />
              ))}
            </List>
          )}
        </Card>
      </div>
    </AppShell>
  )
}
