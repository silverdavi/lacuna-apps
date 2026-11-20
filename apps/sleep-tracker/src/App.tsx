import { useEffect, useState } from 'react'
import { Body, Button, Card, EmptyState, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'
import { host } from './host/mock'
import { formatDuration, QUALITIES, type Quality, type SleepEntry, type SleepState } from './host'

const DAY = 86400000

function today(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function dayTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`)
}

function parseDuration(text: string): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const m = t.match(/^(\d+)\s*h(?:\s*(\d{1,2})\s*m?)?$/)
  if (m) return Number(m[1]) * 60 + (m[2] ? Number(m[2]) : 0)
  const h = t.match(/^(\d{1,2})\s*m$/)
  if (h) return Number(h[1])
  const all = t.match(/^(\d+)$/)
  if (all) return Number(all[1])
  return null
}

function computeStreak(entries: SleepEntry[]): number {
  if (!entries.length) return 0
  const days = new Set(entries.map((e) => dayTime(e.date)))
  const max = Math.max(...entries.map((e) => dayTime(e.date)))
  let streak = 0
  let cursor = max
  while (days.has(cursor)) {
    streak += 1
    cursor -= DAY
  }
  return streak
}

function averageMinutes(entries: SleepEntry[]): number {
  if (!entries.length) return 0
  const total = entries.reduce((n, e) => n + e.minutes, 0)
  return Math.floor(total / entries.length + 0.5)
}

function TrendChart({ entries }: { entries: SleepEntry[] }) {
  const width = 340
  const height = 150
  const padX = 30
  const padTop = 16
  const padBottom = 24
  const innerW = width - padX * 2
  const innerH = height - padTop - padBottom
  const hours = entries.map((e) => e.minutes / 60)
  const min = Math.min(...hours)
  const max = Math.max(...hours)
  const span = max - min || 1
  const step = entries.length > 1 ? innerW / (entries.length - 1) : 0
  const pts = entries.map((e, i) => {
    const x = entries.length > 1 ? padX + i * step : padX + innerW / 2
    const y = padTop + innerH - ((e.minutes / 60 - min) / span) * innerH
    return { x, y, entry: e }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  return (
    <section aria-label="trend chart">
      <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
        TREND
      </MonoLabel>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Trend of nights logged"
        style={{ display: 'block', marginTop: 'calc(8px * var(--sf))' }}
      >
        <path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p) => (
          <circle key={p.entry.id} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="3.5" fill="var(--accent)" />
        ))}
        {pts.map((p) => (
          <text
            key={`v-${p.entry.id}`}
            x={p.x.toFixed(2)}
            y={(p.y - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(8.5px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.entry.minutes / 60}
          </text>
        ))}
        {pts.map((p) => (
          <text
            key={`d-${p.entry.id}`}
            x={p.x.toFixed(2)}
            y={(height - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(8.5px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.entry.date}
          </text>
        ))}
      </svg>
    </section>
  )
}

function Heatmap({ entries }: { entries: SleepEntry[] }) {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const dates = [...byDate.keys()].sort()
  return (
    <section aria-label="heatmap">
      <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
        HEATMAP
      </MonoLabel>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'calc(4px * var(--sf))',
          marginTop: 'calc(8px * var(--sf))',
        }}
      >
        {dates.map((date) => {
          const e = byDate.get(date)
          return (
            <div
              key={date}
              title={`${date}: ${formatDuration(e?.minutes ?? 0)}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'calc(2px * var(--sf))',
                padding: 'calc(6px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 'calc(4px * var(--sf))',
                background: 'var(--ui-bright)',
              }}
            >
              <span style={{ font: '400 calc(9px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>{date}</span>
              <span
                style={{
                  font: '600 calc(11px * var(--tf)) var(--mono)',
                  color: 'var(--accent)',
                }}
              >
                {formatDuration(e?.minutes ?? 0)}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function App() {
  const [state, setState] = useState<SleepState>(() => host.read())
  const [date, setDate] = useState(today())
  const [duration, setDuration] = useState('')
  const [quality, setQuality] = useState<Quality>('Good')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setError(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const entries = state.entries
  const avg = averageMinutes(entries)
  const streak = computeStreak(entries)

  function logSleep() {
    const minutes = parseDuration(duration)
    if (minutes === null || minutes <= 0) {
      setError('Enter a valid duration')
      return
    }
    const d = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today()
    setState(host.addEntry(d, minutes, quality))
    setDuration('')
    setError(null)
  }

  function remove(id: string) {
    setState(host.deleteEntry(id))
  }

  return (
    <main style={{ display: 'block', width: '100%', padding: 'calc(20px * var(--sf))' }}>
      <Card mono="Sleep" accent>
        <Stack lg>
          <div>
            <h1
              style={{
                margin: 0,
                font: '600 calc(22px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
                letterSpacing: 'calc(-0.01em * var(--tf))',
              }}
            >
              Sleep Tracker
            </h1>
            <Body>Log your nightly sleep and watch the pattern form.</Body>
          </div>

          <div
            style={{
              padding: 'calc(14px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(6px * var(--sf))',
              background: 'var(--ui-bright)',
            }}
          >
            <Stack>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(12px * var(--sf))',
                  alignItems: 'flex-end',
                }}
              >
                <TextInput label="Date" value={date} onChange={(v) => setDate(v)} />
                <TextInput label="Duration" value={duration} onChange={(v) => setDuration(v)} />
                <label className="lc-field" style={{ marginBottom: 0 }}>
                  <span className="lc-field-label">Quality</span>
                  <select
                    className="lc-input"
                    value={quality}
                    onChange={(e) => setQuality(e.target.value as Quality)}
                  >
                    {QUALITIES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {error && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--danger)',
                    font: '500 calc(11px * var(--tf)) var(--mono)',
                    letterSpacing: 'calc(0.4px * var(--sf))',
                  }}
                >
                  {error}
                </div>
              )}
              <Button kind="primary" onClick={logSleep}>
                Log sleep
              </Button>
            </Stack>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(20px * var(--sf))',
              padding: 'calc(12px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line)',
              borderRadius: 'calc(4px * var(--sf))',
              background: 'var(--paper-deep)',
            }}
          >
            <Body>Total nights: {entries.length}</Body>
            <Body>Average duration: {formatDuration(avg)}</Body>
            <Body>Streak: {streak} days</Body>
          </div>

          {entries.length === 0 ? (
            <EmptyState title="No sleep entries yet" detail="Log your first night to see the pattern." />
          ) : (
            <>
              <div>
                <MonoLabel sm style={{ color: 'var(--ink-60)' }}>
                  ENTRIES
                </MonoLabel>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 'calc(8px * var(--sf)) 0 0',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(6px * var(--sf))',
                  }}
                >
                  {entries.map((e) => (
                    <li
                      key={e.id}
                      role="listitem"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'calc(10px * var(--sf))',
                        padding: 'calc(8px * var(--sf))',
                        border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                        borderRadius: 'calc(4px * var(--sf))',
                        background: 'var(--ui-bright)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(12px * var(--sf))' }}>
                        <span style={{ font: '400 calc(13px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>
                          {e.date}
                        </span>
                        <span style={{ font: '600 calc(15px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>
                          {formatDuration(e.minutes)}
                        </span>
                        <span style={{ font: '400 calc(13px * var(--tf)) var(--sans)', color: 'var(--ink-60)' }}>
                          {e.quality}
                        </span>
                      </div>
                      <Button kind="ghost" onClick={() => remove(e.id)}>
                        Delete {e.date}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>

              <Heatmap entries={entries} />
              <TrendChart entries={entries} />
            </>
          )}
        </Stack>
      </Card>
    </main>
  )
}
