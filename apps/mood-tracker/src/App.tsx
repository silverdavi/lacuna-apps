import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { Heatmap } from '@lacuna/heatmap'
import { addDays } from '@lacuna/date-math'
import { toCsv } from '@lacuna/csv-parse'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { openFile } from '@lacuna/file-save-open'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { computeStreaks } from '@lacuna/streak-calc'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Select,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { dayKey, host, MOODS, type MoodEntry } from './host'
import { MOOD_COLOR, MOOD_VALUE } from './colors'

type BackupRecord = {
  day: string
  mood: string
  note: string
  createdAt: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function moodColor(mood: string): string {
  return MOOD_COLOR[mood] ?? 'var(--ink-60)'
}

function backupRecords(entries: MoodEntry[]): Array<{
  id: string
  data: BackupRecord
  createdAt: number
  updatedAt: number
}> {
  return entries.map((entry) => {
    const at = Date.parse(entry.createdAt)
    const ts = Number.isNaN(at) ? 0 : at
    return {
      id: entry.id,
      data: { day: entry.day, mood: entry.mood, note: entry.note, createdAt: entry.createdAt },
      createdAt: ts,
      updatedAt: ts,
    }
  })
}

function csvRows(entries: MoodEntry[]): string[][] {
  return [
    ['id', 'day', 'mood', 'note', 'createdAt'],
    ...entries.map((entry) => [entry.id, entry.day, entry.mood, entry.note, entry.createdAt]),
  ]
}

export function App() {
  const [entries, setEntries] = useState<MoodEntry[]>(() => host.listMoods())
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const today = dayKey()

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
    const days: { key: string; label: string; color: string; filled: boolean }[] = []
    const cursor = new Date()
    for (let i = 6; i >= 0; i -= 1) {
      const day = addDays(cursor, -i)
      const key = dayKey(day)
      const entry = byDay.get(key)
      days.push({
        key,
        label: WEEKDAYS[day.getDay()] ?? 'Day',
        color: entry ? moodColor(entry.mood) : 'var(--paper-deep)',
        filled: Boolean(entry),
      })
    }
    return days
  }, [byDay])

  const trend = useMemo<ChartDataPoint[]>(
    () =>
      entries.slice(0, 14).map((entry) => ({
        label: entry.day.slice(5),
        value: MOOD_VALUE[entry.mood] ?? 0,
      })),
    [entries],
  )

  const exportOptions = useMemo<ExportOption[]>(
    () => [
      {
        id: 'json',
        label: 'Backup (JSON)',
        mimeType: 'application/json',
        extension: 'json',
        getData: () =>
          exportBackup<BackupRecord>({
            appId: 'mood-tracker',
            version: 1,
            records: backupRecords(entries),
          }),
      },
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => toCsv(csvRows(entries)),
      },
    ],
    [entries],
  )

  const log = () => {
    if (!mood) {
      setError('Select a mood')
      setToast('')
      return
    }
    host.addMood(mood, note, today, new Date().toISOString())
    setEntries(host.listMoods())
    setNote('')
    setError('')
    setToast(`Logged ${mood}`)
  }

  const remove = (entry: MoodEntry) => {
    host.deleteMood(entry.id)
    setEntries(host.listMoods())
    setToast(`Deleted ${entry.mood}`)
  }

  const onExport = (id: string) => {
    setToast(id === 'json' ? 'Backup exported' : 'CSV exported')
  }

  const pickImport = () => {
    fileRef.current?.click()
  }

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setImportError(`Could not read ${file.name}: ${result.error}`)
      return
    }
    try {
      const imported = importBackup<BackupRecord>(JSON.stringify(result.data), {
        currentVersion: 1,
        validate: (record) =>
          typeof record.data.mood === 'string' &&
          typeof record.data.day === 'string' &&
          MOODS.some((moodOption) => moodOption === record.data.mood)
            ? null
            : 'record is not a mood entry',
      })
      if (imported.droppedCount > 0) {
        setImportError(`Imported ${imported.records.length} entries, dropped ${imported.droppedCount}`)
      } else {
        setImportError('')
        setToast(`Imported ${imported.records.length} entries`)
      }
      const fresh = host.listMoods().map((entry) => entry.id)
      for (const record of imported.records) {
        if (!fresh.includes(record.id)) {
          host.addMood(record.data.mood, record.data.note, record.data.day, record.data.createdAt)
        }
      }
      setEntries(host.listMoods())
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import that file')
    }
  }

  return (
    <AppShell
      name="Mood Tracker"
      icon="analytics"
      hue="green"
      category="Wellbeing"
      meta={`${entries.length} ${entries.length === 1 ? 'mood' : 'moods'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Mood Tracker"
          note="One mood a day"
          chips={[`${entries.length} logs`, `Streak ${streakDays}d`]}
        />
      }
    >
      <Card
        mono="Log"
        title="Today"
        actions={
          entries.length > 0 ? (
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <ExportMenu options={exportOptions} fileName="mood-tracker" ariaLabel="Export" onExport={onExport} />
              <Button kind="secondary" onClick={pickImport} ariaLabel="Import backup">
                Import
              </Button>
            </div>
          ) : undefined
        }
      >
        <Stack>
          <div aria-label="Streak">
            <KpiRow>
              <Kpi value={streakDays} label={`Streak: ${streakDays} days`} accent />
              <Kpi value={`${week.filter((day) => day.filled).length}/7`} label="This week" />
            </KpiRow>
          </div>
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
          {toast ? <Body>{toast}</Body> : null}
        </Stack>
      </Card>

      <Card mono="Days" title="Last 7 days">
        <div
          aria-label="Last 7 days"
          style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}
        >
          {week.map((day) => (
            <div key={day.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
              <div
                role="img"
                data-filled={day.filled ? 'true' : 'false'}
                aria-label={day.label}
                style={{
                  width: 'calc(22px * var(--sf))',
                  height: 'calc(22px * var(--sf))',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: day.color,
                  outline: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                }}
              />
              <MonoLabel>{day.label}</MonoLabel>
            </div>
          ))}
        </div>
      </Card>

      <Card mono="Trend" title="Mood trend">
        {entries.length === 0 ? (
          <Body>Log moods to plot the trend.</Body>
        ) : (
          <Chart
            type="line"
            data={trend}
            title="Mood value, last 14 entries"
            width={560}
            height={180}
            ariaLabel="Value trend over the last 14 entries"
          />
        )}
      </Card>

      <Card mono="Year" title="Activity">
        {entries.length === 0 ? (
          <Body>Log moods to build the year view.</Body>
        ) : (
          <div
            style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}
          >
            {entries.slice(0, 14).map((entry) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
                <div
                  role="img"
                  aria-label={entry.mood}
                  style={{
                    width: 'calc(14px * var(--sf))',
                    height: 'calc(14px * var(--sf))',
                    borderRadius: 'calc(2px * var(--sf))',
                    background: moodColor(entry.mood),
                    outline: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  }}
                />
                <MonoLabel>{entry.day.slice(5)}</MonoLabel>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card mono="Log" title="Moods">
        {entries.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No moods logged yet"
            detail="Pick a mood and press Log mood to start the streak."
          />
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
                  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                  <Tag accent={entry.day === today}>{entry.day}</Tag>
                  <span>
                    {entry.mood}
                    {entry.note ? ` — ${entry.note}` : ''}
                  </span>
                </span>
                <Button kind="ghost" onClick={() => remove(entry)}>
                  Delete {entry.mood}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {importError ? (
          <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
            <ErrorState title={importError} detail="The log is unchanged. You can keep importing." />
          </div>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={onImportFile}
        />
      </Card>
    </AppShell>
  )
}
