import { useMemo, useState } from 'react'
import { addDays } from '@lacuna/date-math'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { Heatmap, type HeatmapCell } from '@lacuna/heatmap'
import { computeStreaks } from '@lacuna/streak-calc'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  FormGrid,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { dayKey, host, MOODS, type MoodEntry } from './host'
import { MOOD_COLOR, MOOD_VALUE } from './colors'

export function App() {
  const [entries, setEntries] = useState<MoodEntry[]>(() => host.listMoods())
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const streakDays = useMemo(
    () => computeStreaks(entries.map((entry) => entry.day)).current,
    [entries],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, MoodEntry>()
    for (const entry of entries) map.set(entry.day, entry)
    return map
  }, [entries])

  const week = useMemo(() => {
    const days: { key: string; label: string }[] = []
    const cursor = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const day = addDays(cursor, -i)
      days.push({
        key: dayKey(day),
        label: day.toLocaleDateString(undefined, { weekday: 'short' }),
      })
    }
    return days
  }, [])

  const heatmap = useMemo(() => {
    const cells: HeatmapCell[] = []
    const cursor = new Date()
    for (let i = 0; i < 365; i += 1) {
      const day = addDays(cursor, -i)
      const key = dayKey(day)
      const entry = byDay.get(key)
      cells.push({ date: key, value: entry ? MOOD_VALUE[entry.mood] ?? 3 : 0 })
    }
    return cells
  }, [byDay])

  const trend = useMemo(() => {
    const points: ChartDataPoint[] = []
    for (const [day, entry] of byDay) {
      points.push({ label: day.slice(5), value: MOOD_VALUE[entry.mood] ?? 3 })
    }
    points.sort((a, b) => (a.label < b.label ? -1 : 1))
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

  return (
    <AppShell
      name="Mood Tracker"
      icon="analytics"
      hue="teal"
      category="Wellbeing"
      meta={`${entries.length} ${entries.length === 1 ? 'mood' : 'moods'}`}
      status="Saved on this device"
    >
      <Card mono="Wellbeing">
        <Stack>
          <Body>{`Streak: ${streakDays} days`}</Body>
          <FormGrid>
            <Select
              label="Mood"
              value={mood}
              onChange={setMood}
              options={[{ value: '', label: 'Pick one' }, ...MOODS]}
              error={error || null}
            />
            <TextInput label="Note" value={note} onChange={setNote} placeholder="How was it?" />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={log}>
              Log mood
            </Button>
          </Actions>
        </Stack>
      </Card>

      <Card mono="Days" title="Last 7 days">
        <div
          role="group"
          aria-label="Last 7 days"
          style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}
        >
          {week.map((day) => {
            const entry = byDay.get(day.key)
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
                  background: entry ? MOOD_COLOR[entry.mood] ?? 'var(--accent)' : 'var(--mid)',
                  outline: 'calc(1px * var(--sf)) solid var(--line)',
                }}
              />
            )
          })}
        </div>
      </Card>

      <Card mono="Year" title="2026">
        <Heatmap data={heatmap} max={5} />
      </Card>

      <Card mono="Mood" title="Trend">
        {trend.length > 0 ? (
          <Chart type="line" data={trend} title="Trend" ariaLabel="Trend" height={160} />
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
                <Button kind="ghost" onClick={() => remove(entry)}>
                  Delete {entry.mood}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  )
}
