// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { formatDuration, parseDuration } from '@lacuna/format-duration'
import { useClipboard } from '@lacuna/use-clipboard'
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

function toHuman(ms: number): string {
  return formatDuration(ms).replace(/:\d{2}$/, '')
}

function chip(value: string, accent = false): CSSProperties {
  return {
    fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--tf))',
    letterSpacing: 'calc(0.3px * var(--sf))',
    padding: 'calc(3px * var(--sf)) calc(8px * var(--sf))',
    borderRadius: 'calc(4px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid ' + (accent ? 'var(--accent)' : 'var(--hair)'),
    background: accent ? 'var(--accent-soft)' : 'var(--paper-deep)',
    color: accent ? 'var(--accent)' : 'var(--ink)',
  }
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
  const elapsed = started ? total - remaining : 0
  const progress = started ? Math.round((elapsed / total) * 1000) / 10 : 0

  const { copied, copy } = useClipboard({ timeoutMs: 1800 })
  const resultText = started ? `${toHuman(elapsed)} / ${toHuman(total)}` : null

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
      const lapElapsed = totalRef.current - remainingRef.current
      lapCounterRef.current += 1
      const label = lapCounterRef.current
      setLaps((prev) => [...prev, { label, ms: toSeconds(lapElapsed) }])
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

  async function onCopyResult() {
    if (resultText != null) await copy(resultText)
  }

  const status = finished
    ? 'Finished'
    : started
      ? running
        ? 'Counting down'
        : 'Paused'
      : 'Ready'

  const chips = [
    { key: 'preset', value: preset || 'custom', accent: false },
    { key: 'duration', value: started ? toHuman(total) : toHuman(parseDuration(duration) || 0), accent: false },
    { key: 'elapsed', value: started ? toHuman(elapsed) : '0:00', accent: false },
    { key: 'laps', value: `${laps.length} lap${laps.length === 1 ? '' : 's'}`, accent: false },
    { key: 'state', value: finished ? 'FINISHED' : started ? (running ? 'RUNNING' : 'PAUSED') : 'READY', accent: finished || running },
  ]

  return (
    <AppShell
      name="Countdown Timer"
      icon="timesheets"
      hue="rust"
      category="Productivity"
      meta={started ? (running ? 'running' : 'paused') : finished ? 'done' : undefined}
      status={status}
      side={
        <Rail title="Status" note={resultText ?? 'Last result is ready to copy'}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(6px * var(--sf))',
              alignItems: 'center',
            }}
          >
            {chips.map((c) => (
              <span key={c.key} style={chip(c.value, c.accent)}>
                {c.value}
              </span>
            ))}
          </div>
          {resultText != null ? (
            <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
              <Button kind={copied ? 'primary' : 'secondary'} onClick={() => void onCopyResult()}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
            </div>
          ) : null}
        </Rail>
      }
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
        <Card title="Clock" accent={finished}>
          {started || finished ? (
            <>
              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(64px * var(--tf))',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 'calc(-0.01em * var(--tf))',
                  color: finished ? 'var(--danger)' : 'var(--ink)',
                  margin: 'calc(4px * var(--sf)) 0 calc(12px * var(--sf))',
                }}
              >
                {formatDuration(Math.max(0, remaining))}
              </div>
              {started ? (
                <div style={{ marginBottom: 'calc(14px * var(--sf))' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontFamily: 'var(--mono)',
                      fontSize: 'calc(12px * var(--tf))',
                      color: 'var(--ink-60)',
                      marginBottom: 'calc(5px * var(--sf))',
                    }}
                  >
                    <span>Elapsed {toHuman(elapsed)}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div
                    style={{
                      height: 'calc(6px * var(--sf))',
                      background: 'var(--paper-deep)',
                      borderRadius: 'calc(3px * var(--sf))',
                      overflow: 'hidden',
                      border: 'calc(1px * var(--sf)) solid var(--hair)',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        transition: 'width 120ms linear',
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {finished ? (
                <EmptyState
                  title="Time's up"
                  detail="The countdown reached zero."
                  actionLabel="Start again"
                  onAction={start}
                />
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
                          <Button
                            ariaLabel={`Delete Lap ${lap.label}`}
                            onClick={() => removeLap(i)}
                          >
                            Delete Lap {lap.label}
                          </Button>
                        ) : null
                      }
                    />
                  ))}
                </List>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No timer set"
              detail="Enter a duration or pick a preset, then start."
              actionLabel="Start"
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
