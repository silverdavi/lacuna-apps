import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Table,
  TextInput,
  PrimaryButton,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { store, type Entry } from './host/mock'

type SortDir = 'none' | 'asc' | 'desc'

const STATUS_OPTIONS = ['Present', 'Absent', 'Late'] as const
const STATUS_RANK: Record<Entry['status'], number> = { Present: 0, Absent: 1, Late: 2 }

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`
}

function todayIso(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function App() {
  const [entries, setEntries] = useState<Entry[]>(() => store.list())
  const [name, setName] = useState('')
  const [date, setDate] = useState(todayIso())
  const [status, setStatus] = useState<Entry['status']>('Present')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('none')
  const [copied, setCopied] = useState(false)
  const clipboard = useClipboard()

  function addEntry() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    const when = date || todayIso()
    setError(null)
    store.add({ name: trimmed, date: when, status })
    setEntries(store.list())
    setName('')
    setDate(when)
  }

  function deleteEntry(entry: Entry) {
    store.remove(entry.id)
    setEntries(store.list())
  }

  function toggleSort() {
    setSortDir((d) => (d === 'none' ? 'asc' : d === 'asc' ? 'desc' : 'none'))
  }

  function exportCsv() {
    const lines = ['Name,Date,Status', ...sorted.map((e) => `${e.name},${e.date},${e.status}`)]
    void clipboard.copy(lines.join('\n')).then(() => setCopied(true))
  }

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Late: 0 }
    for (const e of entries) c[e.status]++
    return c
  }, [entries])

  const uniqueNames = useMemo(() => new Set(entries.map((e) => e.name.trim().toLowerCase())).size, [entries])
  const total = counts.Present + counts.Absent + counts.Late
  const chips = [
    `${total} ${total === 1 ? 'entry' : 'entries'}`,
    `${uniqueNames} ${uniqueNames === 1 ? 'person' : 'people'}`,
    `${counts.Present} on site`,
    `${counts.Absent} missed`,
    `${counts.Late} tardy`,
  ]

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => q === '' || e.name.toLowerCase().includes(q))
  }, [entries, search])

  const sorted = useMemo(() => {
    if (sortDir === 'none') return visible
    return [...visible].sort((a, b) => {
      const cmp =
        a.date.localeCompare(b.date) ||
        STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
        a.name.localeCompare(b.name)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [visible, sortDir])

  const dateDisplay = useMemo(() => {
    const map = new Map<string, string>()
    for (let i = 0; i < sorted.length; i++) {
      const e = sorted[i]
      const isLastOfDate = i === sorted.length - 1 || sorted[i + 1].date !== e.date
      map.set(e.id, isLastOfDate ? e.date : longDate(e.date))
    }
    return map
  }, [sorted])

  const dateLabel = (
    <span
      onClick={toggleSort}
      style={{ cursor: 'pointer', userSelect: 'none', display: 'block', width: '100%' }}
    >
      Date
      <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : sortDir === 'desc' ? ' ↓' : ''}</span>
    </span>
  )

  return (
    <AppShell
      name="Attendance Tracker"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${total} ${total === 1 ? 'entry' : 'entries'}`}
      status={`${total} ${total === 1 ? 'entry' : 'entries'} · ${counts.Present} on site · ${counts.Absent} missed · ${counts.Late} tardy`}
      actions={
        total > 0 ? (
          <Button kind="secondary" onClick={exportCsv} title="Copy the current table as CSV">
            Export CSV
          </Button>
        ) : undefined
      }
      side={
        <Rail title="Summary" note={`${counts.Present} of ${total} on site`} chips={chips}>
          <Stack>
            <KpiRow>
              <Kpi value={counts.Present} label="On site" accent />
              <Kpi value={counts.Absent} label="Missed" />
              <Kpi value={counts.Late} label="Tardy" />
            </KpiRow>
          </Stack>
        </Rail>
      }
    >
      <Stack>
        <Card title="New entry" mono="RECORD AN ENTRY">
          <FormGrid>
            <TextInput
              label="Name"
              value={name}
              onChange={(v) => {
                setName(v)
                if (error) setError(null)
              }}
              error={error}
            />
            <TextInput label="Date" type="date" value={date} onChange={setDate} />
            <label className="lc-field">
              <span className="lc-field-label">Status</span>
              <select
                className="lc-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as Entry['status'])}
                aria-label="Status"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} label={s} />
                ))}
              </select>
            </label>
          </FormGrid>
          <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <Actions>
              <PrimaryButton onClick={addEntry}>Add entry</PrimaryButton>
            </Actions>
          </div>
        </Card>

        <Card
          title="Entries"
          mono="ALL ENTRIES"
          actions={
            <span style={{ display: 'inline-flex', gap: 'calc(10px * var(--sf))', flexWrap: 'wrap' }}>
              <TextInput label="Search" type="search" value={search} onChange={setSearch} placeholder="Filter by name" />
            </span>
          }
        >
          {entries.length === 0 ? (
            <EmptyState
              title="No entries yet"
              detail="Add the first one above."
              actionLabel="Add an entry"
              onAction={addEntry}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              title="No matching entries"
              detail="Try a different name."
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : (
            <>
              <Table
                label="Attendance entries"
                columns={[
                  { key: 'name', label: 'Name' },
                  { key: 'date', label: dateLabel },
                  { key: 'status', label: 'Status' },
                  { key: 'actions', label: '' },
                ]}
                rows={sorted.map((e) => ({
                  cells: {
                    name: e.name,
                    date: dateDisplay.get(e.id) ?? e.date,
                    status: e.status,
                    actions: (
                      <Button kind="ghost" ariaLabel={`Delete ${e.name}`} onClick={() => deleteEntry(e)}>
                        <span aria-hidden="true">Delete</span>
                      </Button>
                    ),
                  },
                }))}
              />
              <div style={{ marginTop: 'var(--sp-3)', display: 'flex', justifyContent: 'space-between', gap: 'calc(10px * var(--sf))' }}>
                <span style={{ color: 'var(--ink-60)', fontSize: 'calc(12px * var(--tf))' }}>
                  Total: {visible.length}
                </span>
                {copied ? <span style={{ color: 'var(--ink-40)', fontSize: 'calc(11px * var(--tf))' }}>Copied to clipboard</span> : null}
              </div>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
