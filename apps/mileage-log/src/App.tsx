// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppShell, Body, Button, EmptyState, Stack, Table, TextInput } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'

interface Entry {
  odometer: number
  gallons: number
  cost: number
  note: string
}

const fmt = (n: number) => String(Math.round(n * 100) / 100)

const emptyDraft = { odometer: '', gallons: '', cost: '', note: '' }

export function App() {
  const [tab, setTab] = useState('Entries')
  const [formOpen, setFormOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(emptyDraft)

  const { state, actions } = useCollection<Entry>({ storageKey: 'mileage-log' })
  const entries = state.activeItems.map((item) => item.data)
  const clipboard = useClipboard()

  const patch = (field: keyof typeof emptyDraft) => (value: string) =>
    setDraft((d) => ({ ...d, [field]: value }))

  const save = () => {
    const odometer = Number(draft.odometer)
    const gallons = Number(draft.gallons)
    const cost = Number(draft.cost)
    if (draft.odometer === '' || !Number.isFinite(odometer)) return
    if (!Number.isFinite(gallons) || gallons < 0) return
    if (!Number.isFinite(cost) || cost < 0) return
    actions.add({ odometer, gallons, cost, note: draft.note })
    setDraft(emptyDraft)
    setFormOpen(false)
  }

  const remove = (id: string) => actions.remove(id)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.activeItems
    return state.activeItems.filter(
      (item) =>
        item.data.note.toLowerCase().includes(q) ||
        String(item.data.odometer).includes(q) ||
        String(item.data.gallons).includes(q),
    )
  }, [state.activeItems, query])

  const summary = useMemo(() => {
    const gallons = entries.reduce((s, e) => s + e.gallons, 0)
    const cost = entries.reduce((s, e) => s + e.cost, 0)
    const totalMiles = entries.length ? entries[entries.length - 1].odometer : 0
    const span = entries.length > 1 ? entries[entries.length - 1].odometer - entries[0].odometer : 0
    const mpg = gallons > 0 ? Math.round((span / gallons) * 10) / 10 : 0
    return { miles: totalMiles, gallons, cost, mpg }
  }, [entries])

  const exportCsv = async () => {
    const rows = [
      ['odometer', 'gallons', 'cost', 'note'],
      ...entries.map((e) => [fmt(e.odometer), fmt(e.gallons), e.cost.toFixed(2), e.note]),
    ]
    try {
      await clipboard.copy(toCsv(rows))
    } catch {
      // Clipboard may be unavailable in this context.
    }
  }

  const tabButton = (label: string): CSSProperties => ({
    fontFamily: 'var(--sans)',
    fontSize: 'calc(12.5px * var(--tf))',
    fontWeight: 600,
    color: tab === label ? 'var(--ink)' : 'var(--ink-80)',
    padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
    border: 'none',
    background: 'none',
    borderBottom: `calc(2px * var(--sf)) solid ${tab === label ? 'var(--accent)' : 'transparent'}`,
    cursor: 'pointer',
  })

  return (
    <AppShell
      name="Vehicle Mileage Log"
      icon="docs"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      actions={
        <>
          <Button kind="secondary" onClick={() => setFormOpen((open) => !open)}>
            Add entry
          </Button>
          <Button kind="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </>
      }
    >
      <Stack lg>
        <div role="tablist" aria-label="Views" style={{ display: 'flex', gap: 'calc(20px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
          <button type="button" role="tab" aria-selected={tab === 'Entries'} style={tabButton('Entries')} onClick={() => setTab('Entries')}>
            Entries
          </button>
          <button type="button" role="tab" aria-selected={tab === 'Summary'} style={tabButton('Summary')} onClick={() => setTab('Summary')}>
            Summary
          </button>
        </div>

        {tab === 'Entries' ? (
          <div role="tabpanel" aria-label="Entries">
            <Stack lg>
            <TextInput label="Search" type="search" value={query} onChange={setQuery} placeholder="Filter notes" />

            {formOpen && (
              <Stack>
                <TextInput label="Odometer" type="number" value={draft.odometer} onChange={patch('odometer')} />
                <TextInput label="Gallons" type="number" value={draft.gallons} onChange={patch('gallons')} />
                <TextInput label="Cost" type="number" value={draft.cost} onChange={patch('cost')} />
                <TextInput label="Note" value={draft.note} onChange={patch('note')} />
                <Button kind="primary" onClick={save}>
                  Save
                </Button>
              </Stack>
            )}

            {visible.length === 0 ? (
              <EmptyState
                title={query ? 'No matching entries' : 'No entries yet'}
                detail={query ? 'Try a different search.' : 'Log a fuel fill to see totals here.'}
                actionLabel={query ? 'Refine the search' : 'Log a fill'}
                onAction={query ? undefined : () => setFormOpen(true)}
              />
            ) : (
              <Stack>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
                  {visible.map((item) => {
                    const e = item.data
                    return (
                      <li
                        key={item.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 'calc(12px * var(--sf))',
                          padding: 'calc(10px * var(--sf)) calc(12px * var(--sf))',
                          border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                          borderRadius: 'var(--radius)',
                        }}
                      >
                        <Body>
                          {fmt(e.odometer)} · {fmt(e.gallons)} gal · ${e.cost.toFixed(2)}
                          {e.note ? ` · ${e.note}` : ''}
                        </Body>
                        <Button kind="ghost" ariaLabel="Delete" onClick={() => remove(item.id)}>
                          Delete
                        </Button>
                      </li>
                    )
                  })}
                </ul>
                <Body sm>
                  Total miles: {fmt(summary.miles)}
                </Body>
                <Body sm>Total cost: ${summary.cost.toFixed(2)}</Body>
              </Stack>
            )}
            </Stack>
          </div>
        ) : (
          <div role="tabpanel" aria-label="Summary">
            <Stack lg>
            <Table
              label="Summary"
              columns={[
                { key: 'metric', label: 'Metric' },
                { key: 'value', label: 'Value', num: true },
              ]}
              rows={[
                { cells: { metric: 'Total miles', value: fmt(summary.miles) } },
                { cells: { metric: 'Total gallons', value: fmt(summary.gallons) } },
                { cells: { metric: 'Total cost', value: `$${summary.cost.toFixed(2)}` } },
                { cells: { metric: 'Average MPG', value: fmt(summary.mpg) } },
              ]}
            />
            {entries.length === 0 ? (
              <EmptyState title="Nothing to summarize yet" detail="Add an entry on the Entries tab." actionLabel="Go to entries" onAction={() => setTab('Entries')} />
            ) : null}
            </Stack>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}
