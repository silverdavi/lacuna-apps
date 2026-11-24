// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  TextInput,
} from '@lacuna/ui'
import type { BudgetRecord, EventRecord, PackingRecord } from './host'

type TabId = 'Calendar' | 'Budget' | 'Packing'

interface Plan {
  events: EventRecord[]
  budget: BudgetRecord[]
  packing: PackingRecord[]
}

function compactDate(iso: string): string {
  return iso.replace(/-/g, '')
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const day = new Date(y, m - 1, d)
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' })
  const month = day.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday}, ${month} ${d}`
}

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function CalendarTab({
  events,
  onSave,
}: {
  events: EventRecord[]
  onSave: (title: string, date: string, startTime: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard()

  function save() {
    if (!title.trim() || !date || !time) {
      setError('Title, date, and start time are required')
      return
    }
    onSave(title.trim(), date, time)
    setEditing(false)
    setTitle('')
    setDate('')
    setTime('')
    setError(null)
  }

  function exportIcs() {
    const icsEvents: IcsEvent[] = events.map((event) => ({
      id: event.id,
      summary: event.title,
      startDate: `${event.date}T${event.startTime}:00`,
      allDay: false,
    }))
    void copy(toIcs(icsEvents))
  }

  function openForm() {
    setEditing(true)
    setError(null)
  }

  const byDay = new Map<string, EventRecord[]>()
  for (const event of events) {
    const list = byDay.get(event.date) ?? []
    list.push(event)
    byDay.set(event.date, list)
  }
  const days = [...byDay.keys()].sort()

  return (
    <Card
      mono="Planner"
      title="Calendar"
      actions={
        <Actions>
          <Button kind="ghost" onClick={openForm}>
            New event
          </Button>
          <Button kind="secondary" disabled={events.length === 0} onClick={exportIcs}>
            {copied ? 'Copied ICS' : 'Export ICS'}
          </Button>
        </Actions>
      }
    >
      {editing && (
        <>
      <FormGrid>
        <TextInput
          label="Title"
          value={title}
          onChange={(v) => { setTitle(v); setError(null) }}
          error={error ?? undefined}
          placeholder="Flight to Paris"
        />
        <TextInput label="Date" type="date" value={date} onChange={setDate} />
        <TextInput label="Start time" type="time" value={time} onChange={setTime} />
      </FormGrid>
          <Actions>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </Actions>
          <Divider />
        </>
      )}
      {days.length === 0 && !editing ? (
        <EmptyState mono="Empty" title="No events yet" detail="Use the New event button above to add your first one." actionLabel="New event" />
      ) : (
        <List>
          {days.flatMap((day) =>
            byDay.get(day)!.map((event) => (
              <Row
                key={event.id}
                title={event.title}
                meta={dateLabel(day)}
                value={compactDate(day)}
              />
            )),
          )}
        </List>
      )}
    </Card>
  )
}

function BudgetTab({
  items,
  onAdd,
  onDelete,
}: {
  items: BudgetRecord[]
  onAdd: (item: string, amount: number) => void
  onDelete: (id: string) => void
}) {
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  function add() {
    const parsed = Number(amount)
    if (!item.trim() || amount.trim() === '' || !Number.isFinite(parsed) || parsed < 0) {
      setError('An item and a valid amount are required')
      return
    }
    onAdd(item.trim(), parsed)
    setItem('')
    setAmount('')
    setError(null)
  }

  const total = items.reduce((sum, entry) => sum + entry.amount, 0)
  const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Card mono="Spend" title="Budget">
      <FormGrid>
        <TextInput
          label="Item"
          value={item}
          onChange={(v) => { setItem(v); setError(null) }}
          placeholder="Hotel"
        />
        <TextInput
          label="Amount"
          inputMode="decimal"
          value={amount}
          onChange={(v) => { setAmount(v); setError(null) }}
          error={error ?? undefined}
          placeholder="450.75"
        />
      </FormGrid>
      <Actions>
        <PrimaryButton onClick={add}>Add item</PrimaryButton>
      </Actions>
      {items.length > 0 ? (
        <>
          <Divider />
          <List>
            {items.map((entry) => (
              <Row
                key={entry.id}
                title={entry.item}
                value={items.length > 1 ? `$${money(entry.amount)}` : money(entry.amount)}
                action={
                  <Button kind="ghost" ariaLabel={`Delete ${entry.item}`} onClick={() => onDelete(entry.id)}>
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
          <Divider />
          <li className="lk-row">
            <span className="lk-row-text">
              <span className="lk-row-title">Spent</span>
            </span>
            <span className="lk-row-value">Total: ${money(total)}</span>
          </li>
        </>
      ) : (
        <EmptyState mono="Empty" title="No expenses yet" detail="Use the form above to add your first one." actionLabel="Add item" />
      )}
    </Card>
  )
}

function PackingTab({
  items,
  onAdd,
  onToggle,
  onRemove,
}: {
  items: PackingRecord[]
  onAdd: (name: string) => void
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  function add() {
    const name = draft.trim()
    if (!name) return
    onAdd(name)
    setDraft('')
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') add()
  }

  const packed = items.filter((entry) => entry.packed).length

  return (
    <Card mono="Checklist" title="Packing list">
      <FormGrid>
        <div className="lc-field">
          <label htmlFor="packing-new-item">New item</label>
          <input
            id="packing-new-item"
            className="lc-input"
            type="text"
            value={draft}
            placeholder="Passport"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKey}
          />
          <span className="lk-field-hint">Press Enter to add</span>
        </div>
      </FormGrid>
      <Actions>
        <PrimaryButton onClick={add}>Add to list</PrimaryButton>
      </Actions>
      {items.length > 0 ? (
        <>
          <Divider />
          <List>
            {items.map((entry) => (
              <li key={entry.id} className="lk-row">
                <span className="lk-row-text">
                  <label className="lc-field">
                    <input
                      type="checkbox"
                      className="lc-input"
                      checked={entry.packed}
                      onChange={() => onToggle(entry.id)}
                    />
                    <span className="lk-row-title">{entry.name}</span>
                  </label>
                </span>
                <Button kind="ghost" onClick={() => onRemove(entry.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </List>
          <Divider />
          <li className="lk-row">
            <span className="lk-row-text">
              <span className="lk-row-title">Packed</span>
            </span>
            <span className="lk-row-value">{`${packed} of ${items.length} packed`}</span>
          </li>
        </>
      ) : (
        <EmptyState mono="Empty" title="Nothing packed yet" detail="Type an item above and press Enter to add it." actionLabel="Add item" />
      )}
    </Card>
  )
}

const TABS: TabId[] = ['Calendar', 'Budget', 'Packing']

function Tablist({
  tabs,
  active,
  onSelect,
}: {
  tabs: TabId[]
  active: TabId
  onSelect: (tab: TabId) => void
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const index = tabs.indexOf(active)
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length
    const target = tabs[next]
    onSelect(target)
    refs.current[target]?.focus()
  }

  return (
    <div className="lc-tabs tp-tabs" role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          id={`tab-${item}`}
          aria-selected={item === active}
          aria-controls={`panel-${item}`}
          className={item === active ? 'lc-tab active' : 'lc-tab'}
          ref={(el) => { refs.current[item] = el }}
          onClick={() => onSelect(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

let idCounter = 0

function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

export function App() {
  const [tab, setTab] = useState<TabId>('Calendar')
  const { value: plan, set } = useLocalRecord<Plan>({
    key: 'lacuna.travel-planner',
    version: 0,
    defaultValue: { events: [], budget: [], packing: [] },
  })

  function saveEvent(title: string, date: string, startTime: string) {
    const event: EventRecord = { id: nextId('ev'), createdAt: Date.now(), title, date, startTime }
    set((prev) => ({ ...prev, events: [...prev.events, event] }))
  }

  function addBudget(item: string, amount: number) {
    const entry: BudgetRecord = { id: nextId('bud'), createdAt: Date.now(), item, amount }
    set((prev) => ({ ...prev, budget: [...prev.budget, entry] }))
  }

  function deleteBudget(id: string) {
    set((prev) => ({ ...prev, budget: prev.budget.filter((entry) => entry.id !== id) }))
  }

  function addPacking(name: string) {
    const entry: PackingRecord = { id: nextId('pk'), createdAt: Date.now(), name, packed: false }
    set((prev) => ({ ...prev, packing: [...prev.packing, entry] }))
  }

  function togglePacking(id: string) {
    set((prev) => ({
      ...prev,
      packing: prev.packing.map((entry) => (entry.id === id ? { ...entry, packed: !entry.packed } : entry)),
    }))
  }

  function removePacking(id: string) {
    set((prev) => ({ ...prev, packing: prev.packing.filter((entry) => entry.id !== id) }))
  }

  const packed = plan.packing.filter((entry) => entry.packed).length
  const total = plan.budget.reduce((sum, entry) => sum + entry.amount, 0)
  const chips = useMemo(
    () => [
      `${plan.events.length} events`,
      `${plan.budget.length} expenses`,
      'ICS export',
    ],
    [plan.events.length, plan.budget.length],
  )

  return (
    <AppShell
      name="Travel Planner"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${plan.events.length} event${plan.events.length === 1 ? '' : 's'} · ${packed} packed`}
      side={
        <Rail title="Trip" note="Local plan" chips={chips} />
      }
    >
      <Tablist tabs={TABS} active={tab} onSelect={setTab} />
      {tab === 'Calendar' && (
        <div id="panel-Calendar" role="tabpanel" aria-labelledby="tab-Calendar">
          <CalendarTab events={plan.events} onSave={saveEvent} />
        </div>
      )}
      {tab === 'Budget' && (
        <div id="panel-Budget" role="tabpanel" aria-labelledby="tab-Budget">
          <BudgetTab items={plan.budget} onAdd={addBudget} onDelete={deleteBudget} />
        </div>
      )}
      {tab === 'Packing' && (
        <div id="panel-Packing" role="tabpanel" aria-labelledby="tab-Packing">
          <PackingTab items={plan.packing} onAdd={addPacking} onToggle={togglePacking} onRemove={removePacking} />
        </div>
      )}
    </AppShell>
  )
}
