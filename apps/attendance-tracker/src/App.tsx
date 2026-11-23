import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Table,
  TextInput,
  PrimaryButton,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { store, type Entry } from './host/mock'

type SortDir = 'none' | 'asc' | 'desc'

const STATUS_OPTIONS = ['Present', 'Absent', 'Late'] as const

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

export function App() {
  const [entries, setEntries] = useState<Entry[]>(() => store.list())
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState<string>('Present')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('none')
  const clipboard = useClipboard()

  function addEntry() {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    setError(null)
    store.add({ name: trimmed, date, status: status as Entry['status'] })
    setEntries(store.list())
    setName('')
    setDate('')
  }

  function deleteEntry(entry: Entry) {
    store.remove(entry.id)
    setEntries(store.list())
  }

  function toggleSort() {
    setSortDir((d) => (d === 'none' ? 'asc' : d === 'asc' ? 'desc' : 'none'))
  }

  const filtered = entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))

  const sorted =
    sortDir === 'none'
      ? filtered
      : [...filtered].sort((a, b) => {
          const cmp = a.date.localeCompare(b.date)
          return sortDir === 'asc' ? cmp : -cmp
        })

  const dateDisplay = new Map<string, string>()
  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]
    const isLastOfDate = i === sorted.length - 1 || sorted[i + 1].date !== e.date
    dateDisplay.set(e.id, isLastOfDate ? e.date : longDate(e.date))
  }

  function exportCsv() {
    const lines = ['Name,Date,Status', ...sorted.map((e) => `${e.name},${e.date},${e.status}`)]
    void clipboard.copy(lines.join('\n'))
  }

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
    <AppShell name="Attendance Tracker" icon="calendar" hue="teal" category="Productivity">
      <Card title="New entry">
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
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Status"
            >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} label={s} />
                  ))}
            </select>
          </label>
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={addEntry}>Add entry</PrimaryButton>
        </Actions>
      </Card>

      <Card
        title="Entries"
        actions={
          entries.length > 0 ? (
            <span>
              <TextInput
                label="Search"
                type="search"
                value={search}
                onChange={setSearch}
                placeholder="Filter by name"
              />
              <Button kind="secondary" onClick={exportCsv}>
                Export CSV
              </Button>
            </span>
          ) : undefined
        }
      >
        {entries.length === 0 ? (
          <EmptyState
            title="No entries yet"
            detail="Add the first one above."
            actionLabel="Add an entry"
            onAction={addEntry}
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
                    <Button
                      kind="ghost"
                      ariaLabel={`Delete ${e.name}`}
                      onClick={() => deleteEntry(e)}
                    >
                      <span aria-hidden="true">Delete</span>
                    </Button>
                  ),
                },
              }))}
            />
            <p style={{ marginTop: 'var(--sp-3)' }}>Total: {entries.length}</p>
            {clipboard.copied ? <p>Copied to clipboard</p> : null}
          </>
        )}
      </Card>
    </AppShell>
  )
}
