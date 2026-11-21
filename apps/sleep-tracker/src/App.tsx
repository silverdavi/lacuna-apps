import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { host } from './host/mock'
import {
  QUALITIES,
  addEntry,
  averageMinutes,
  computeStreak,
  deleteEntry,
  formatDuration,
  heatmapCells,
  isLoggable,
  isValidDate,
  parseDuration,
  sortEntries,
  trendPoints,
  type Quality,
  type SleepEntry,
  type SleepState,
} from './engine'

function today(): string {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
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
  const points = trendPoints(entries)
  const pts = points.map((p, i) => {
    const x = points.length > 1 ? padX + i * step : padX + innerW / 2
    const y = padTop + innerH - ((p.hours - min) / span) * innerH
    return { x, y, point: p }
  })
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')
  return (
    <section aria-label="trend chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Trend of nights logged"
        style={{ display: 'block' }}
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
          <circle key={p.point.id} cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r="3.5" fill="var(--accent)" />
        ))}
        {pts.map((p) => (
          <text
            key={`v-${p.point.id}`}
            x={p.x.toFixed(2)}
            y={(p.y - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(10px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.point.hours}
          </text>
        ))}
        {pts.map((p) => (
          <text
            key={`d-${p.point.id}`}
            x={p.x.toFixed(2)}
            y={(height - 8).toFixed(2)}
            textAnchor="middle"
            fontSize="calc(10px * var(--tf))"
            fill="var(--ink-40)"
            fontFamily="var(--mono)"
          >
            {p.point.date}
          </text>
        ))}
      </svg>
    </section>
  )
}

function Heatmap({ entries }: { entries: SleepEntry[] }) {
  const cells = heatmapCells(entries)
  return (
    <section aria-label="heatmap">
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'calc(4px * var(--sf))',
        }}
      >
        {cells.map((cell) => (
          <div
            key={cell.date}
            title={`${cell.date}: ${cell.label}`}
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
            <span style={{ font: '400 calc(9px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>{cell.date}</span>
            <span style={{ font: '600 calc(11px * var(--tf)) var(--mono)', color: 'var(--accent)' }}>{cell.label}</span>
          </div>
        ))}
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

  const entries = sortEntries(state.entries)
  const avg = averageMinutes(entries)
  const streak = computeStreak(entries)

  function logSleep() {
    const minutes = parseDuration(duration)
    if (!isLoggable(duration) || minutes === null) {
      setError('Enter a valid duration')
      return
    }
    const d = isValidDate(date) ? date : today()
    const next = addEntry(host.read(), { date: d, minutes, quality, createdAt: Date.now() }, makeId)
    host.write(next)
    setState(next)
    setDuration('')
    setError(null)
  }

  function remove(id: string) {
    const next = deleteEntry(host.read(), id)
    host.write(next)
    setState(next)
  }

  return (
    <AppShell
      name="Sleep Tracker"
      icon="calendar"
      hue="teal"
      category="Personal"
      meta={`${entries.length} ${entries.length === 1 ? 'night' : 'nights'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Sleep Tracker"
          note="Log nightly sleep"
          chips={['Date', 'Duration', 'Quality', 'Offline']}
        />
      }
    >
      <Card mono="New" title="Log a night">
        <Stack>
          <FormGrid>
            <TextInput label="Date" value={date} onChange={setDate} />
            <TextInput label="Duration" value={duration} onChange={setDuration} />
            <Select
              label="Quality"
              value={quality}
              onChange={(v) => setQuality(v as Quality)}
              options={QUALITIES.map((q) => ({ value: q, label: q }))}
            />
          </FormGrid>
          {error ? (
            <div role="alert" style={{ color: 'var(--danger)' }}>{error}</div>
          ) : null}
          <Actions>
            <Button kind="primary" onClick={logSleep}>
              Log sleep
            </Button>
          </Actions>
        </Stack>
      </Card>

      <Card mono={`${entries.length} saved`} title="Summary">
        <div
          style={{
            display: 'flex',
            gap: 'calc(16px * var(--sf))',
          }}
        >
          <div style={{ font: '500 calc(12px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>
            Total nights: <span style={{ color: 'var(--ink)' }}>{entries.length}</span>
          </div>
          <div style={{ font: '500 calc(12px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>
            Average duration: <span style={{ color: 'var(--ink)' }}>{formatDuration(avg)}</span>
          </div>
          <div style={{ font: '500 calc(12px * var(--tf)) var(--mono)', color: 'var(--ink-60)' }}>
            Streak: <span style={{ color: 'var(--accent)' }}>{streak} days</span>
          </div>
        </div>
      </Card>

      <Card mono={entries.length ? `${entries.length} entries` : 'Empty'} title="Entries">
        {entries.length === 0 ? (
          <EmptyState mono="Empty" title="No sleep entries yet" detail="Log your first night to see the pattern." />
        ) : (
          <List label="Sleep entries">
            {entries.map((e) => (
              <Row
                key={e.id}
                title={e.date}
                meta={e.quality}
                value={formatDuration(e.minutes)}
                action={
                  <Button kind="ghost" onClick={() => remove(e.id)}>
                    Delete {e.date}
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>

      {entries.length > 0 ? (
        <>
          <Card mono="Pattern" title="Heatmap">
            <Heatmap entries={entries} />
          </Card>
          <Card mono="Pattern" title="Trend">
            <TrendChart entries={entries} />
          </Card>
        </>
      ) : null}
    </AppShell>
  )
}
