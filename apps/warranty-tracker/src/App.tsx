// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, PrimaryButton, Rail, Table, Tag, TextInput } from '@lacuna/ui'
import { addDays, fromISODate, startOfDay } from '@lacuna/date-math'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { addWarranty, listWarranties, removeWarranty, statusLabel, statusOf, updateWarranty, REFERENCE_TODAY, type Warranty } from './host'
import './App.css'

type SortKey = 'name' | 'purchase' | 'end'
type SortDir = 'asc' | 'desc'
type SortState = { key: SortKey; dir: SortDir } | null
type Tab = 'All' | 'Expiring soon'

const TABS: Tab[] = ['All', 'Expiring soon']

export function App() {
  const [version, setVersion] = useState(0)
  const [tab, setTab] = useState<Tab>('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>(null)

  const [name, setName] = useState('')
  const [purchase, setPurchase] = useState('')
  const [end, setEnd] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; purchase?: string; end?: string }>({})

  const [lastRemoved, setLastRemoved] = useState<Warranty | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const items = useMemo(() => {
    void version
    try {
      return listWarranties()
    } catch {
      return []
    }
  }, [version])

  const today = useMemo(() => startOfDay(REFERENCE_TODAY), [])
  const expiringCutoff = useMemo(() => addDays(today, 90).getTime(), [today])

  const counts = useMemo(() => {
    let active = 0
    let expiring = 0
    let expired = 0
    for (const w of items) {
      const s = statusOf(w, today)
      if (s === 'active') active++
      else if (s === 'expiring') expiring++
      else expired++
    }
    return { active, expiring, expired, total: items.length }
  }, [items, today])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const endBeforeCutoff = (w: Warranty) => {
      const d = fromISODate(w.end)
      return d != null && d.getTime() < expiringCutoff
    }
    let rows = items.filter((w) => (tab === 'Expiring soon' ? endBeforeCutoff(w) : true))
    if (q) rows = rows.filter((w) => w.name.toLowerCase().includes(q))
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1
      return [...rows].sort((a, b) => a[sort.key].localeCompare(b[sort.key]) * dir)
    }
    return rows
  }, [items, tab, query, sort, expiringCutoff])

  const tableLabel = tab === 'Expiring soon' ? 'Warranties expiring within 90 days' : 'Warranties'

  function bump() {
    setVersion((v) => v + 1)
  }

  function save() {
    const errors: { name?: string; purchase?: string; end?: string } = {}
    const n = name.trim()
    const p = purchase.trim()
    const e = end.trim()
    if (!n) errors.name = 'Enter a product name'
    if (!p || fromISODate(p) == null) errors.purchase = 'Enter a valid purchase date'
    if (!e || fromISODate(e) == null) errors.end = 'Enter a valid warranty end date'
    const pd = fromISODate(p)
    const ed = fromISODate(e)
    if (!errors.purchase && !errors.end && pd != null && ed != null && ed.getTime() < pd.getTime()) errors.end = 'Warranty end must be on or after the purchase date'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    try {
      addWarranty({ name: n, purchase: p, end: e })
      setName('')
      setPurchase('')
      setEnd('')
      setLastRemoved(null)
      setActionError(null)
      bump()
    } catch {
      setActionError('Could not save the warranty. Try again.')
    }
  }

  function onDelete(w: Warranty) {
    try {
      removeWarranty(w.id)
      setLastRemoved(w)
      setActionError(null)
      bump()
    } catch {
      setActionError('Could not remove the warranty. Try again.')
    }
  }

  function onUndo() {
    if (lastRemoved == null) return
    try {
      addWarranty(lastRemoved)
      setLastRemoved(null)
      setActionError(null)
      bump()
    } catch {
      setActionError('Could not restore the warranty. Try again.')
    }
  }

  function toggleSort(key: SortKey) {
    if (sort != null && sort.key === key) {
      setSort({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' })
    } else {
      setSort({ key, dir: 'asc' })
    }
  }

  function sortIndicator(key: SortKey) {
    const glyph = sort?.key !== key ? '↕' : sort?.dir === 'asc' ? '↑' : '↓'
    return (
      <span aria-hidden="true" className="wt-sort-indicator">
        {glyph}
      </span>
    )
  }

  function exportCsv() {
    const rows = [
      ['Product name', 'Purchase date', 'Warranty end', 'Status'],
      ...visible.map((w) => [w.name, w.purchase, w.end, statusLabel(statusOf(w, today))]),
    ]
    try {
      saveText(toCsv(rows), { filename: 'warranties.csv', mimeType: 'text/csv' })
      setActionError(null)
    } catch {
      setActionError('Could not export the CSV. Try again.')
    }
  }

  function editName(w: Warranty) {
    const next = window.prompt('Rename warranty:', w.name)
    if (next == null) return
    const value = next.trim()
    if (value.length === 0) return
    try {
      updateWarranty(w.id, { name: value })
      setActionError(null)
      bump()
    } catch {
      setActionError('Could not rename the warranty. Try again.')
    }
  }

  function headerHint(key: SortKey) {
    return sort?.key === key
      ? `Sort direction: ${sort.dir}. Click to switch.`
      : 'Click to sort by this column.'
  }

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      className="wt-sort"
      title={headerHint(key)}
      onClick={() => toggleSort(key)}
    >
      {label}
      {sortIndicator(key)}
    </button>
  )

  return (
    <AppShell
      name="Warranty Tracker"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${counts.total} saved`}
      status={`Active ${counts.active} · Expiring ${counts.expiring} · Expired ${counts.expired}`}
      side={
        <Rail
          title="Warranties"
          note="Add a product with its purchase date and warranty end, then track what expires and when."
          chips={[`${counts.total} saved`, `${counts.active} active`, `${counts.expiring} expiring in 90 days`, `${counts.expired} expired`, 'CSV export']}
        />
      }
    >
      <Card mono="New" title="Add warranty">
        <FormGrid>
          <TextInput label="Product name" value={name} onChange={setName} placeholder="Laptop" error={fieldErrors.name} />
          <TextInput label="Purchase date" type="date" value={purchase} onChange={setPurchase} error={fieldErrors.purchase} />
          <TextInput label="Warranty end" type="date" value={end} onChange={setEnd} error={fieldErrors.end} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={save}>Save warranty</PrimaryButton>
          <Button kind="secondary" onClick={exportCsv}>Export CSV</Button>
          {lastRemoved != null && <Button kind="secondary" onClick={onUndo}>Undo</Button>}
        </Actions>
        {actionError != null && <div role="alert" className="wt-error">{actionError}</div>}
      </Card>

      <Card mono={tab === 'Expiring soon' ? `${visible.length} soon` : `${visible.length} of ${counts.total}`} title="Warranties" flush>
        <div role="tablist" aria-label="Warranty views" className="wt-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`wt-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <TextInput label="Search" type="search" value={query} onChange={setQuery} placeholder="Laptop" />
        <Table
          label={tableLabel}
          columns={[
            { key: 'name', label: headerButton('name', 'Product name') },
            { key: 'purchase', label: headerButton('purchase', 'Purchase date') },
            { key: 'end', label: headerButton('end', 'Warranty end') },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: ' ' },
          ]}
          rows={visible.map((w) => {
            const s = statusOf(w, today)
            return {
              cells: {
                name: w.name,
                purchase: w.purchase,
                end: w.end,
                status: <Tag accent={s === 'expiring'}>{statusLabel(s)}</Tag>,
                actions: (
                  <>
                    <Button kind="ghost" ariaLabel={`Edit ${w.name}`} onClick={() => editName(w)}>Edit</Button>{' '}
                    <Button kind="danger" ariaLabel={`Delete ${w.name}`} onClick={() => onDelete(w)}>Delete</Button>
                  </>
                ),
              },
            }
          })}
          empty={
            tab === 'Expiring soon' && visible.length === 0 ? (
              <EmptyState mono="Soon" title="Nothing is expiring soon" detail="No warranty ends within the next 90 days." actionLabel="Show all warranties" onAction={() => setTab('All')} />
            ) : (
              <EmptyState mono="Empty" title="No warranties yet" detail="Add your first product above." actionLabel="Add a warranty" onAction={() => setTab('All')} />
            )
          }
        />
      </Card>

      <Card mono="Totals" title="Overview">
        <KpiRow>
          <Kpi value={String(counts.active)} label="Active" />
          <Kpi value={String(counts.expiring)} label="Expiring within 90 days" accent />
          <Kpi value={String(counts.expired)} label="Expired" />
        </KpiRow>
      </Card>
    </AppShell>
  )
}
