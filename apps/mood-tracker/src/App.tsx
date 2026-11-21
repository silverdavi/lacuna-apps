import { useEffect, useMemo, useState } from 'react'
import { Body, Button, Card, Stack } from '@lacuna/ui'
import { dayKey, host, MOODS, type MoodEntry } from './host'

const MOOD_VALUE: Record<string, number> = {
  Anxious: 1,
  Low: 2,
  Calm: 3,
  Good: 4,
  Great: 5,
}

const MOOD_COLOR: Record<string, string> = {
  Anxious: 'hsl(350 65% 55%)',
  Low: 'hsl(30 80% 55%)',
  Calm: 'hsl(200 60% 50%)',
  Good: 'hsl(150 55% 45%)',
  Great: 'hsl(140 70% 40%)',
}

const EMPTY = 'hsl(220 10% 60%)'

function computeStreak(entries: MoodEntry[]): number {
  const days = new Set(entries.map((entry) => entry.day))
  let streak = 0
  const cursor = new Date()
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }
  while (days.has(dayKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function App() {
  const [entries, setEntries] = useState<MoodEntry[]>(() => host.listMoods())
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setEntries(host.listMoods())
  }, [])

  const streak = useMemo(() => computeStreak(entries), [entries])
  const byDay = useMemo(() => {
    const map = new Map<string, MoodEntry>()
    for (const entry of entries) map.set(entry.day, entry)
    return map
  }, [entries])

  const week = useMemo(() => {
    const days: { key: string; label: string }[] = []
    const cursor = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(cursor)
      day.setDate(cursor.getDate() - i)
      days.push({ key: dayKey(day), label: day.toLocaleDateString(undefined, { weekday: 'short' }) })
    }
    return days
  }, [])

  const trend = useMemo(() => {
    const points: { day: string; mood: string; value: number }[] = []
    for (const [day, entry] of byDay) {
      points.push({ day, mood: entry.mood, value: MOOD_VALUE[entry.mood] ?? 3 })
    }
    points.sort((a, b) => (a.day < b.day ? -1 : 1))
    return points.slice(-30)
  }, [byDay])

  const log = () => {
    if (!mood) {
      setError('Select a mood')
      return
    }
    host.addMood(mood, note, dayKey(), new Date().toISOString())
    setEntries(host.listMoods())
    setNote('')
    setError('')
  }

  const remove = (entry: MoodEntry) => {
    host.deleteMood(entry.id)
    setEntries(host.listMoods())
  }

  const W = 320
  const H = 160
  const pad = 24
  const xFor = (index: number, count: number) =>
    count <= 1 ? W / 2 : pad + (index * (W - pad * 2)) / (count - 1)
  const yFor = (value: number) => H - pad - ((value - 1) * (H - pad * 2)) / 4
  const first = trend[0]

  return (
    <main>
      <h1 style={{ margin: 'calc(8px * var(--sf))' }}>Mood Tracker</h1>
      <Card mono="Wellbeing">
        <Stack>
          <Body>{`Streak: ${streak} days`}</Body>
          <label className="lc-field">
            <span className="lc-field-label">Mood</span>
            <select
              className="lc-input"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
            >
              <option value="" disabled>
                Pick one
              </option>
              {MOODS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="lc-field">
            <span className="lc-field-label">Note</span>
            <input
              className="lc-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {error && <Body sm>{error}</Body>}
          <Button kind="primary" onClick={log}>
            Log mood
          </Button>
        </Stack>
      </Card>

      <Card mono="Days" title="Last 7 days">
        <div role="group" aria-label="Last 7 days" style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
          {week.map((day) => {
            const entry = byDay.get(day.key)
            const filled = entry ? MOOD_COLOR[entry.mood] : undefined
            return (
              <div
                key={day.key}
                role="img"
                data-filled={entry ? 'true' : 'false'}
                aria-label={entry ? `${day.label} ${entry.mood}` : day.label}
                style={{
                  width: 'calc(22px * var(--sf))',
                  height: 'calc(22px * var(--sf))',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: filled ?? 'var(--mid)',
                  outline: 'calc(1px * var(--sf)) solid var(--line)',
                }}
              />
            )
          })}
        </div>
      </Card>

      <Card mono="Mood" title="Trend">
        {first ? (
          <svg
            width={W}
            height={H}
            role="img"
            aria-label={`Trend, ${first.mood} on ${first.day}`}
          >
            <polyline
              fill="none"
              stroke="none"
              points={trend.map((p, i) => `${xFor(i, trend.length)},${yFor(p.value)}`).join(' ')}
            />
            {trend.map((p, i) => (
              <line
                key={`${p.day}-${i}`}
                x1={xFor(i, trend.length) - 4}
                y1={yFor(p.value)}
                x2={xFor(i, trend.length) + 4}
                y2={yFor(p.value)}
                stroke={MOOD_COLOR[p.mood] ?? EMPTY}
                strokeWidth={8}
                strokeLinecap="round"
              />
            ))}
          </svg>
        ) : (
          <Body>Log a mood to see the trend.</Body>
        )}
      </Card>

      <Card mono="Log" title="Moods">
        {entries.length === 0 ? (
          <Body>No moods logged yet</Body>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {entries.map((entry) => (
              <li
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'calc(8px * var(--sf))',
                  padding: 'calc(8px * var(--sf)) 0',
                }}
              >
                <span>
                  {entry.mood}
                  {entry.note ? ` — ${entry.note}` : ''}
                </span>
                <Button onClick={() => remove(entry)}>Delete {entry.mood}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
