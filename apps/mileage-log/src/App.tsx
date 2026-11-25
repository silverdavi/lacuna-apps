// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Row,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { addEntry, deleteEntry, listEntries, type MileageEntry } from './host'

const TABS = ['Entries', 'Summary'] as const
type Tab = (typeof TABS)[number]

const emptyDraft = { odometer: '', gallons: '', cost: '', note: '' }

const money = (n: number) => `$${n.toFixed(2)}`

export function App() {
  const [tab, setTab] = useState<Tab>('Entries')
  const [entries, setEntries] = useState<MileageEntry[]>(() => listEntries())
  const [formOpen, setFormOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(emptyDraft)
  const [error, setError] = useState<string | null>(null)
  const clipboard = useClipboard()

  const patch = (field: keyof typeof emptyDraft) => (value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  const save = () => {
    const odometer = Number(draft.odometer)
    const gallons = Number(draft.gallons)
    const cost = Number(draft.cost)
    if (draft.odometer === '' || !Number.isFinite(odometer)) {
      setError('Odometer must be a number, e.g. 12500')
      return
    }
    if (draft.gallons === '' || !Number.isFinite(gallons) || gallons < 0) {
      setError('Gallons must be a number, e.g. 10.5')
      return
    }
    if (draft.cost === '' || !Number.isFinite(cost) || cost < 0) {
      setError('Cost must be a number, e.g. 45.25')
      return
    }
    setEntries([...entries, addEntry({ odometer, gallons, cost, note: draft.note.trim() })])
    setDraft(emptyDraft)
    setFormOpen(false)
    setError(null)
  }

  const remove = (id: string) => {
    deleteEntry(id)
    setEntries(entries.filter((e) => e.id !== id))
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.note.toLowerCase().includes(q) ||
        String(e.odometer).includes(q) ||
        String(e.gallons).includes(q) ||
        String(e.cost).includes(q),
    )
  }, [entries, query])

  const summary = useMemo(() => {
    const gallons = entries.reduce((s, e) => s + e.gallons, 0)
    const cost = entries.reduce((s, e) => s + e.cost, 0)
    const miles = entries.length > 0 ? entries[entries.length - 1].odometer : 0
    const span =
      entries.length > 1 ? entries[entries.length - 1].odometer - entries[0].odometer : 0
    const mpg = gallons > 0 && span > 0 ? span / gallons : 0
    return { miles, gallons, cost, mpg }
  }, [entries])

  const exportCsv = async () => {
    const rows: string[][] = [
      ['odometer', 'gallons', 'cost', 'note'],
      ...entries.map((e) => [String(e.odometer), String(e.gallons), e.cost.toFixed(2), e.note]),
    ]
    try {
      await clipboard.copy(toCsv(rows))
    } catch {
      // Clipboard may be unavailable in this context.
    }
  }

  return (
    <AppShell
      name="Vehicle Mileage Log"
      icon="wallet"
      hue="teal"
      category="Productivity"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      actions={
        <>
          <Button kind="secondary" onClick={() => setFormOpen((open) => !open)}>
            Add entry
          </Button>
          <Button kind="secondary" onClick={exportCsv} disabled={entries.length === 0}>
            Export CSV
          </Button>
        </>
      }
    >
      <Stack lg>
        <div
          role="tablist"
          aria-label="Views"
          style={{ display: 'flex', gap: 'calc(20px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`lc-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Entries' ? (
          <div role="tabpanel" aria-label="Entries">
            <Stack lg>
              <KpiRow>
                <Kpi value={`Total miles: ${summary.miles}`} label="Distance" />
                <Kpi value={`Total cost: ${money(summary.cost)}`} label="Fuel spend" />
              </KpiRow>

              <TextInput
                label="Search"
                type="search"
                value={query}
                onChange={setQuery}
                placeholder="Filter by note, odometer or gallons"
              />

              <Card title="Add entry" mono="New fill">
                <FormGrid>
                  <TextInput
                    label="Odometer"
                    type="number"
                    value={draft.odometer}
                    onChange={patch('odometer')}
                    placeholder="12500"
                  />
                  <TextInput
                    label="Gallons"
                    type="number"
                    value={draft.gallons}
                    onChange={patch('gallons')}
                    placeholder="10.5"
                  />
                  <TextInput
                    label="Cost"
                    type="number"
                    value={draft.cost}
                    onChange={patch('cost')}
                    placeholder="45.25"
                  />
                  <TextInput
                    label="Note"
                    value={draft.note}
                    onChange={patch('note')}
                    placeholder="Full tank"
                  />
                </FormGrid>
                <div>
                  <Button kind="primary" onClick={save}>
                    Save
                  </Button>
                </div>
                {error ? (
                  <p role="alert" className="lk-field-error">
                    {error}
                  </p>
                ) : null}
              </Card>

              {visible.length === 0 ? (
                <EmptyState
                  title={query ? 'No matching entries' : 'No entries yet'}
                  detail={query ? 'Try a different search.' : 'Log a fuel fill to see totals here.'}
                  actionLabel={query ? 'Refine the search' : 'Log a fill'}
                  onAction={query ? undefined : () => setFormOpen(true)}
                />
              ) : (
                <Card mono={`${visible.length} of ${entries.length}`} title="Entries">
                  <List label="Fuel entries">
                    {visible.map((e) => (
                      <Row
                        key={e.id}
                        title={`${e.odometer}`}
                        meta={`${e.gallons} gal · ${e.note || 'no note'}`}
                        value={money(e.cost)}
                        action={
                          <Button kind="ghost" ariaLabel="Delete" onClick={() => remove(e.id)}>
                            Delete
                          </Button>
                        }
                      />
                    ))}
                  </List>
                </Card>
              )}
            </Stack>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Summary">
            <Stack lg>
              <Card title="Summary" mono="All entries">
                <Table
                  label="Summary"
                  columns={[
                    { key: 'metric', label: 'Metric' },
                    { key: 'value', label: 'Value', num: true },
                  ]}
                  rows={[
                    { cells: { metric: 'Total miles', value: String(summary.miles) } },
                    { cells: { metric: 'Total gallons', value: String(summary.gallons) } },
                    { cells: { metric: 'Total cost', value: money(summary.cost) } },
                    { cells: { metric: 'Average MPG', value: summary.mpg.toFixed(1) } },
                  ]}
                />
              </Card>
              {entries.length === 0 ? (
                <EmptyState
                  title="Nothing to summarize yet"
                  detail="Add an entry on the Entries tab."
                  actionLabel="Go to entries"
                  onAction={() => setTab('Entries')}
                />
              ) : null}
            </Stack>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}
