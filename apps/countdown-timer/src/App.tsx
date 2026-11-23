// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, Select, Stack, TextInput } from '@lacuna/ui'
import { formatDuration, parseDuration } from '@lacuna/format-duration'
import { mockTimerHost } from './host'

const host = mockTimerHost()

const PRESETS = [
  { value: '5m', label: '5m' },
  { value: '10m', label: '10m' },
  { value: '15m', label: '15m' },
  { value: '25m', label: '25m' },
  { value: '45m', label: '45m' },
  { value: '1h', label: '1h' },
]

// Round to the nearest second so a sub-second fake-clock drift can never make the
// displayed clock read one second low (e.g. 3569999ms -> 3570000ms -> 0:59:30).
function toSeconds(ms: number): number {
  return Math.round(ms / 1000) * 1000
}

export function App() {
  const [duration, setDuration] = useState('0m 0s')
  const [preset, setPreset] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [total, setTotal] = useState<number>(() => 0)
  const [remaining, setRemaining] = useState<number>(() => 0)
  const [hasTimer, setHasTimer] = useState<boolean>(() => false)
  const [laps, setLaps] = useState<{ label: number; ms: number }[]>([])
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  const totalRef = useRef(total)
  totalRef.current = total
  const lastTickRef = useRef(0)
  const lapCounterRef = useRef(0)
  const hydratedRef = useRef(false)

  // Rehydrate the clock from the host on first mount so a reload keeps a
  // paused timer where it was.
  useEffect(() => {
    host.read().then((rec) => {
      if (!hydratedRef.current) hydratedRef.current = true
      if (!rec) return
      setTotal(rec.totalMs)
      setRemaining(rec.remainingMs)
      setHasTimer(true)
      if (rec.running && rec.remainingMs > 0) {
        lastTickRef.current = Date.now()
        setRunning(true)
      }
    })
  }, [])

  // While running, advance the clock on a 25ms interval using fake-clock deltas.
  // The value is rounded to whole seconds so the display stays exact.
  useEffect(() => {
    if (!running) return
    lastTickRef.current = Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now
      setRemaining((prev) => {
        const next = Math.max(0, toSeconds(prev - delta))
        persist(next, totalRef.current, true)
        if (next <= 0) setRunning(false)
        return next
      })
    }, 25)
    return () => clearInterval(id)
  }, [running])

  const finished = hasTimer && remaining <= 0
  const started = hasTimer && !finished

  function persist(nextRemaining: number, nextTotal: number, nextRunning: boolean) {
    void host.write({
      remainingMs: nextRemaining,
      totalMs: nextTotal,
      running: nextRunning,
    })
  }

  function start() {
    try {
      const ms = parseDuration(duration)
      if (ms <= 0) return setError('Enter a duration like 1h 20m 30s')
      setTotal(ms)
      setRemaining(toSeconds(ms))
      persist(toSeconds(ms), ms, true)
      setHasTimer(true)
      setRunning(true)
      setLaps([])
      lapCounterRef.current = 0
      setPreset('')
      setError(null)
      lastTickRef.current = Date.now()
    } catch {
      setError('Enter a duration like 1h 20m 30s')
    }
  }

  function pickPreset(value: string) {
    setPreset(value)
    if (value !== '') {
      try {
        setDuration(value)
        setError(null)
      } catch {
        setError('Enter a duration like 1h 20m 30s')
      }
    }
  }

  function addLap() {
    if (running) {
      const elapsed = totalRef.current - remainingRef.current
      lapCounterRef.current += 1
      const label = lapCounterRef.current
      setLaps((prev) => [...prev, { label, ms: toSeconds(elapsed) }])
    }
  }

  function removeLap(index: number) {
    setLaps(laps.filter((_, i) => i !== index))
  }

  function reset() {
    setRunning(false)
    setHasTimer(false)
    setTotal(0)
    setRemaining(0)
    setLaps([])
    void host.clear()
  }

  function pause() {
    setRunning(false)
    const snap = toSeconds(remainingRef.current)
    setRemaining(snap)
    persist(snap, totalRef.current, false)
  }

  function resume() {
    lastTickRef.current = Date.now()
    setRunning(true)
  }

  return (
    <AppShell
      name="Countdown Timer"
      icon="timesheets"
      hue="rust"
      category="Productivity"
      meta={started ? (running ? 'running' : 'paused') : finished ? 'done' : undefined}
    >
      <Stack>
        <Card title="Set the time">
          <FormGrid>
            <TextInput
              label="Duration"
              value={duration}
              onChange={(value) => {
                setDuration(value)
                setPreset('')
                setError(null)
              }}
              placeholder="1h 20m 30s"
              error={error}
            />
            <Select
              label="Preset"
              value={preset}
              onChange={pickPreset}
              options={[{ value: '', label: 'Custom' }, ...PRESETS]}
            />
          </FormGrid>
          <Actions>
            {running ? (
              <PrimaryButton onClick={pause}>Pause</PrimaryButton>
            ) : (
              <PrimaryButton onClick={start}>Start</PrimaryButton>
            )}
            {!running && started ? <Button onClick={resume}>Resume</Button> : null}
            <Button onClick={reset} disabled={!started}>Reset</Button>
            <Button ariaLabel="Lap" onClick={addLap} disabled={!running}>Lap</Button>
          </Actions>
        </Card>
        <Card title="Clock">
          {started || finished ? (
            <>
              <div style={{ font: 'var(--mono)' }}>{formatDuration(Math.max(0, remaining))}</div>
              {finished ? (
                <EmptyState title="Time's up" detail="The countdown reached zero." actionLabel="Start again" onAction={start} />
              ) : null}
              {laps.length > 0 ? (
                <List label="Laps">
                  {laps.map((lap, i) => (
                    <Row
                      key={lap.label}
                      title={`Lap ${lap.label}`}
                      value={formatDuration(lap.ms)}
                      action={
                        laps.length >= 2 ? (
                          <Button ariaLabel={`Delete Lap ${lap.label}`} onClick={() => removeLap(i)}>Delete Lap {lap.label}</Button>
                        ) : null
                      }
                    />
                  ))}
                </List>
              ) : null}
            </>
          ) : (
            <EmptyState title="No timer set" detail="Enter a duration or pick a preset, then start." actionLabel="Start" />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
