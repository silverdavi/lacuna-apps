import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { Heatmap, type HeatmapCell } from '@lacuna/heatmap'
import { toCsv } from '@lacuna/csv-parse'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { openFile } from '@lacuna/file-save-open'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
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
  isQuality,
  isLoggable,
  isValidDate,
  parseDuration,
  sortEntries,
  trendPoints,
  type Quality,
  type SleepEntry,
  type SleepState,
} from './engine'

type BackupRecord = {
  date: string
  minutes: number
  quality: string
  createdAt: number
}

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

function backupRecords(entries: SleepEntry[]): Array<{
  id: string
  data: BackupRecord
  createdAt: number
  updatedAt: number
}> {
  return entries.map((entry) => ({
    id: entry.id,
    data: {
      date: entry.date,
      minutes: entry.minutes,
      quality: entry.quality,
      createdAt: entry.createdAt,
    },
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
  }))
}

function csvRows(entries: SleepEntry[]): string[][] {
  return [
    ['id', 'date', 'minutes', 'quality', 'createdAt'],
    ...entries.map((e) => [e.id, e.date, String(e.minutes), e.quality, String(e.createdAt)]),
  ]
}

export function App() {
  const [state, setState] = useState<SleepState>(() => host.read())
  const [date, setDate] = useState(today())
  const [duration, setDuration] = useState('')
  const [quality, setQuality] = useState<Quality>('Good')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [importError, setImportError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setError(null)
        setToast('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const entries = useMemo(() => sortEntries(state.entries), [state.entries])
  const avg = useMemo(() => averageMinutes(entries), [entries])
  const streak = useMemo(() => computeStreak(entries), [entries])

  function logSleep() {
    const minutes = parseDuration(duration)
    if (!isLoggable(duration) || minutes === null) {
      setError('Enter a valid duration')
      setToast('')
      return
    }
    const d = isValidDate(date) ? date : today()
    const next = addEntry(host.read(), { date: d, minutes, quality, createdAt: Date.now() }, makeId)
    host.write(next)
    setState(next)
    setDuration('')
    setError(null)
    setToast('Night logged')
  }

  function remove(id: string) {
    const next = deleteEntry(host.read(), id)
    host.write(next)
    setState(next)
    setToast('Entry deleted')
  }

  function onExport(id: string) {
    setToast(id === 'json' ? 'Backup exported' : 'CSV exported')
  }

  function pickImport() {
    fileRef.current?.click()
  }

  async function onImportFile(event: ChangeEvent<HTMLInputElement>) {
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
          typeof record.data.date === 'string' &&
          record.data.date.length === 10 &&
          Number.isFinite(record.data.minutes) &&
          record.data.minutes > 0 &&
          isQuality(record.data.quality)
            ? null
            : 'record is not a sleep entry',
      })
      if (imported.droppedCount > 0) {
        setImportError(`Imported ${imported.records.length} entries, dropped ${imported.droppedCount}`)
      } else {
        setImportError('')
        setToast(`Imported ${imported.records.length} entries`)
      }
      const current = host.read()
      const existing = new Set(current.entries.map((e) => e.id))
      for (const record of imported.records) {
        if (existing.has(record.id)) continue
        const d = isValidDate(record.data.date) ? record.data.date : today()
        current.entries.push({
          id: record.id,
          date: d,
          minutes: Math.round(record.data.minutes),
          quality: isQuality(record.data.quality) ? record.data.quality : 'Good',
          createdAt: Number.isFinite(record.createdAt) ? record.createdAt : Date.now(),
        })
      }
      host.write(current)
      setState(current)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Could not import that file')
    }
  }

  const trend = useMemo<ChartDataPoint[]>(
    () =>
      trendPoints(entries).map((p) => ({
        label: `${p.date} · ${p.label}`,
        value: p.hours,
      })),
    [entries],
  )

  const heatmapData = useMemo<HeatmapCell[]>(
    () =>
      heatmapCells(entries).map((c) => ({
        date: c.date,
        value: c.minutes,
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
            appId: 'sleep-tracker',
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

  const hasEntries = entries.length > 0

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
          chips={[`${entries.length} nights`, `Streak ${streak}d`, 'Offline']}
        />
      }
    >
      <Card
        mono="New"
        title="Log a night"
        actions={
          hasEntries ? (
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
              <ExportMenu options={exportOptions} fileName="sleep-tracker" ariaLabel="Export" onExport={onExport} />
              <Button kind="secondary" onClick={pickImport} ariaLabel="Import backup">
                Import
              </Button>
            </div>
          ) : undefined
        }
      >
        <Stack>
          <FormGrid>
            <TextInput label="Date" value={date} onChange={setDate} />
            <TextInput label="Duration" value={duration} onChange={setDuration} placeholder="7h 30m" />
            <Select
              label="Quality"
              value={quality}
              onChange={(v) => setQuality(v as Quality)}
              options={QUALITIES.map((q) => ({ value: q, label: q }))}
              error={error}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={logSleep}>
              Log sleep
            </Button>
          </Actions>
          {toast ? <Body>{toast}</Body> : null}
        </Stack>
      </Card>

      <Card mono={`${entries.length} saved`} title="Summary">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(16px * var(--sf))' }}>
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

      <Card mono={hasEntries ? `${entries.length} entries` : 'Empty'} title="Entries">
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

      {hasEntries ? (
        <Card mono="Pattern" title="Heatmap">
          <section aria-label="heatmap">
            <Heatmap
              data={heatmapData}
              year={Number(entries[0].date.slice(0, 4))}
              label={`Nightly sleep, ${entries.length} ${entries.length === 1 ? 'night' : 'nights'}`}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(4px * var(--sf))', marginTop: 'calc(8px * var(--sf))' }}>
              {heatmapCells(entries).map((cell) => (
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
        </Card>
      ) : null}

      {hasEntries ? (
        <Card mono="Pattern" title="Trend">
          <section aria-label="trend chart">
            <Chart
              type="line"
              data={trend}
              title="Trend of nights logged"
              width={560}
              height={180}
              ariaLabel="Trend of nights logged"
            />
          </section>
        </Card>
      ) : null}
    </AppShell>
  )
}
