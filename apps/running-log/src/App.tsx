// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Table,
  TextInput,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { saveBlob } from '@lacuna/file-save-open'
import { host } from './host/mock'
import { paceOf, paceSeconds, type Run } from './host'

type Tab = 'Log' | 'Chart'
type SortDir = 'asc' | 'desc'

const todayISO = () => new Date().toISOString().slice(0, 10)

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

function toCsv(runs: Run[]): string {
  const rows = [
    'date,distance_km,time_min,pace',
    ...runs.map((r) =>
      [r.date, String(r.distance), String(r.time), paceOf(r)].map(csvEscape).join(','),
    ),
  ]
  return rows.join('\n')
}

export function App() {
  const [state, setState] = useState<Run[]>(() => host.read().runs)
  const [tab, setTab] = useState<Tab>('Log')
  const [sortDir, setSortDir] = useState<SortDir | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [date, setDate] = useState(todayISO())
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lacuna.running-log.state') setState(host.read().runs)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const runs = state

  const sorted = [...runs].sort((a, b) =>
    sortDir === 'asc'
      ? a.distance - b.distance || a.date.localeCompare(b.date)
      : b.distance - a.distance || a.date.localeCompare(b.date),
  )

  const q = query.trim().toLowerCase()
  const visible = q
    ? sorted.filter(
        (r) =>
          r.date.toLowerCase().includes(q) ||
          `${r.distance} km`.includes(q) ||
          `${r.time} min`.includes(q) ||
          paceOf(r).toLowerCase().includes(q),
      )
    : sorted

  const chartData: ChartDataPoint[] = runs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
    .map((r) => ({ label: String(r.distance), value: r.distance }))

  const totalDistance = runs.reduce((s, r) => s + r.distance, 0)
  const totalTime = runs.reduce((s, r) => s + r.time, 0)
  const bestPace = runs.length
    ? runs.reduce((best, r) => (paceSeconds(r) < paceSeconds(best) ? r : best), runs[0])
    : null

  function openForm() {
    setShowForm(true)
    setError(null)
    setDate(todayISO())
  }

  function saveRun() {
    const d = distance.trim()
    const t = time.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Pick a valid date')
    const dist = Number(d)
    const mins = Number(t)
    if (!(dist > 0)) return setError('Distance must be a number above 0')
    if (!(mins > 0)) return setError('Time must be a number above 0')
    setState(host.addRun(date, dist, mins).runs)
    setDistance('')
    setTime('')
    setError(null)
    setShowForm(false)
  }

  function remove(id: string) {
    setState(host.deleteRun(id).runs)
  }

  function toggleSort() {
    setSortDir((cur) => (cur === 'desc' ? 'asc' : 'desc'))
  }

  function exportCsv() {
    saveBlob(new Blob([toCsv(sorted)], { type: 'text/csv' }), {
      filename: 'runs.csv',
      mimeType: 'text/csv',
    })
  }

  return (
    <AppShell
      name="Running Log"
      icon="analytics"
      hue="teal"
      category="Personal"
      meta={`${runs.length} ${runs.length === 1 ? 'run' : 'runs'}`}
      side={
        <Rail title="Totals" note={runs.length ? `${totalDistance.toFixed(1)} km · ${totalTime} min` : 'Nothing yet'}>
          <KpiRow>
            <Kpi value={runs.length} label="Runs" />
            <Kpi value={`${totalDistance.toFixed(1)} km`} label="Distance" />
            <Kpi value={`${totalTime} min`} label="Time" />
          </KpiRow>
          {bestPace && <Kpi value={paceOf(bestPace)} label="Best pace" accent />}
        </Rail>
      }
    >
      <div role="tablist" aria-label="Views" className="lc-tabs">
        {(['Log', 'Chart'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="rl-tab"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Log' && (
        <Card mono={showForm ? 'New' : `${runs.length} logged`} title={showForm ? 'Log a run' : 'Your runs'}>
          {showForm ? (
            <>
              <FormGrid>
                <TextInput label="Date" type="date" value={date} onChange={setDate} error={error} />
                <TextInput
                  label="Distance (km)"
                  inputMode="decimal"
                  placeholder="5.2"
                  value={distance}
                  onChange={setDistance}
                />
                <TextInput
                  label="Time (min)"
                  inputMode="decimal"
                  placeholder="28"
                  value={time}
                  onChange={setTime}
                />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveRun}>Save run</PrimaryButton>
                <Button kind="secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </Actions>
            </>
          ) : (
            <>
              <FormGrid>
                <TextInput
                  label="Search runs"
                  type="search"
                  placeholder="Date, distance, time or pace"
                  value={query}
                  onChange={setQuery}
                />
              </FormGrid>
              <Table
                label="Runs"
                columns={[
                  { key: 'date', label: 'Date' },
                  {
                    key: 'distance',
                    label: (
                      <button type="button" className="lc-sort" onClick={toggleSort}>
                        Distance{sortDir === 'desc' ? ' ↓' : sortDir === 'asc' ? ' ↑' : ''}
                      </button>
                    ),
                    num: true,
                  },
                  { key: 'time', label: 'Time', num: true },
                  { key: 'pace', label: 'Pace', num: true },
                  { key: 'del', label: '' },
                ]}
                rows={visible.map((r) => ({
                  cells: {
                    date: r.date,
                    distance: `${r.distance} km`,
                    time: `${r.time} min`,
                    pace: paceOf(r),
                    del: (
                      <Button kind="ghost" ariaLabel={`Delete ${r.date}`} onClick={() => remove(r.id)}>
                        Delete {r.date}
                      </Button>
                    ),
                  },
                }))}
                foot={
                  runs.length
                    ? {
                        date: `${runs.length} run${runs.length === 1 ? '' : 's'}`,
                        distance: totalDistance.toFixed(1),
                        time: String(totalTime),
                        pace: '',
                        del: '',
                      }
                    : undefined
                }
                empty={q ? <span>No runs match</span> : <span>No runs yet</span>}
              />
              {runs.length === 0 ? (
                <EmptyState
                  title="Log your first run"
                  detail="Log your first run to see pace and totals."
                  actionLabel="Add your first run"
                  onAction={openForm}
                />
              ) : null}
              <Actions>
                <PrimaryButton onClick={openForm}>Add run</PrimaryButton>
                <Button kind="secondary" onClick={exportCsv}>
                  Export CSV
                </Button>
              </Actions>
            </>
          )}
        </Card>
      )}

      {tab === 'Chart' && (
        <Card mono={`${runs.length} ${runs.length === 1 ? 'point' : 'points'}`} title="Distance over time">
          {runs.length === 0 ? (
              <EmptyState
                  title="No runs to chart"
                  detail="Log runs to chart your distance."
                  actionLabel="Add a run"
              onAction={() => {
                setTab('Log')
                openForm()
              }}
            />
          ) : (
            <Chart
              type="line"
              data={chartData}
              title="Distance over time"
              width={560}
              height={220}
              ariaLabel="Distance over time"
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
