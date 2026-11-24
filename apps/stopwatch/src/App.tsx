import { useEffect, useRef, useState } from 'react'
import { useClipboard } from '@lacuna/use-clipboard'
import { AppShell, Button, Card, EmptyState, PrimaryButton } from '@lacuna/ui'
import { loadRecord, saveRecord } from './host'

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const centis = Math.floor(ms / 10) % 100
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

export default function App() {
  const { copy } = useClipboard()
  const [initial] = useState(loadRecord)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>(initial.laps)
  const [, setTick] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const tick = () => setTick((t) => t + 1)
    tick()
    const id = window.setInterval(tick, 25)
    return () => window.clearInterval(id)
  }, [running])

  const SPEED = 60

  const start = () => {
    if (running) return
    startRef.current = Date.now()
    setRunning(true)
  }

  const stop = () => {
    if (!running) return
    const stamp = startRef.current
    if (stamp !== null) setElapsed((e) => e + (Date.now() - stamp) * SPEED)
    startRef.current = null
    setRunning(false)
  }

  const reset = () => {
    setRunning(false)
    setElapsed(0)
    setLaps([])
    startRef.current = null
    saveRecord({ running: false, laps: [] })
  }

  const recordLap = () => {
    if (!running) return
    const stamp = startRef.current
    const current = stamp !== null ? elapsed + (Date.now() - stamp) * SPEED : elapsed
    setLaps((prev) => {
      const next = [...prev, current]
      saveRecord({ running: false, laps: next })
      return next
    })
  }

  const handleCopy = async () => {
    if (laps.length === 0) return
    let previous = 0
    const lines = laps.map((total, i) => {
      const split = total - previous
      previous = total
      return `Lap ${i + 1}  ${formatMs(total)}  (+${formatMs(split)})`
    })
    await copy(lines.join('\n'))
  }

  const isIdle = elapsed === 0 && laps.length === 0 && !running
  const stamp = startRef.current
  const displayMs = running && stamp !== null ? elapsed + (Date.now() - stamp) * SPEED : elapsed

  return (
    <AppShell name="Stopwatch App" icon="timesheets" hue="gold" category="Tools">
      <Card title="Timer">
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div
            role="timer"
            style={{ fontSize: '3rem', fontVariantNumeric: 'tabular-nums', marginBottom: '1rem' }}
            aria-live="polite"
          >
            {formatMs(displayMs)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryButton onClick={running ? stop : start} ariaLabel={running ? 'Stop' : 'Start'}>
              {running ? 'Stop' : 'Start'}
            </PrimaryButton>
            <Button kind="secondary" onClick={recordLap} disabled={!running} ariaLabel="Lap">
              Lap
            </Button>
            <Button kind="secondary" onClick={reset} disabled={isIdle} ariaLabel="Reset">
              Reset
            </Button>
            {laps.length >= 2 && (
              <Button kind="ghost" onClick={handleCopy} ariaLabel="Copy laps">
                Copy laps
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Laps">
        {laps.length === 0 ? (
          <EmptyState
            title="No laps yet"
            detail="Record splits with the Lap button while the timer is running."
            actionLabel="Press Start, then Lap"
          />
        ) : (
          <ul className="lk-list">
            {laps.map((total, i) => {
              const split = i > 0 ? total - laps[i - 1] : total
              return (
                <li key={`${i}-${total}`} className="lk-row" aria-label={`Lap ${i + 1}  ${formatMs(total)}`}>
                  <span className="lk-row-value">{formatMs(total)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}
