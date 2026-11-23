import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AppShell, Select } from '@lacuna/ui'
import { Actions, Button, Card, EmptyState, FormGrid, TextInput } from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { toCsv } from '@lacuna/csv-parse'
import { host, type Priority, type Status, type Ticket } from './host'

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
const STATUSES: Status[] = ['Open', 'Closed']

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
const STATUS_RANK: Record<Status, number> = { Open: 0, Closed: 1 }

type SortKey = 'subject' | 'customer' | 'priority' | 'status'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: 'calc(12px * var(--sf))',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'calc(12px * var(--sf))',
}

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
}

const headerStyle: CSSProperties = {
  textAlign: 'left',
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  background: 'var(--paper-deep)',
  color: 'var(--ink)',
}

const headerBtnStyle: CSSProperties = {
  appearance: 'none',
  background: 'none',
  border: 'none',
  padding: 0,
  margin: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'calc(4px * var(--sf))',
}

const cellStyle: CSSProperties = {
  padding: 'calc(8px * var(--sf))',
  borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
  color: 'var(--ink)',
  background: 'var(--paper)',
  textAlign: 'left',
}

function priorityRank(value: unknown): number {
  const p = typeof value === 'string' ? (value as Priority) : 'Medium'
  return PRIORITY_RANK[p] ?? PRIORITY_RANK.Medium
}

function statusRank(value: unknown): number {
  const s = typeof value === 'string' ? (value as Status) : 'Open'
  return STATUS_RANK[s] ?? STATUS_RANK.Open
}

function sortTickets(list: Ticket[], sort: SortState | null): Ticket[] {
  if (!sort) return list
  const { key, dir } = sort
  const factor = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    let cmp: number
    if (key === 'priority') cmp = priorityRank(a.priority) - priorityRank(b.priority)
    else if (key === 'status') cmp = statusRank(a.status) - statusRank(b.status)
    else {
      const va = String(a[key] ?? '')
      const vb = String(b[key] ?? '')
      cmp = va.localeCompare(vb)
    }
    return cmp * factor
  })
}

function matchesQuery(ticket: Ticket, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [ticket.subject, ticket.customer, ticket.priority, ticket.status].some((value) =>
    value.toLowerCase().includes(q),
  )
}

function matchesStatus(ticket: Ticket, status: 'All' | Status): boolean {
  if (status === 'All') return true
  return ticket.status === status
}

const COLUMNS: { key: SortKey; header: string }[] = [
  { key: 'subject', header: 'Subject' },
  { key: 'customer', header: 'Customer' },
  { key: 'priority', header: 'Priority' },
  { key: 'status', header: 'Status' },
]

export function App() {
  const [tickets, setTickets] = useState<Ticket[]>(() => host.loadTickets())

  const [subject, setSubject] = useState('')
  const [customer, setCustomer] = useState('')
  const [priority, setPriority] = useState<Priority>('High')

  const [editing, setEditing] = useState<Ticket | null>(null)
  const [editStatus, setEditStatus] = useState<Status>('Open')

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'All' | Status>('All')
  const [sort, setSort] = useState<SortState | null>(null)

  const addTicket = () => {
    if (!subject.trim() || !customer.trim()) return
    setTickets(host.addTicket(subject.trim(), customer.trim(), priority))
    setSubject('')
    setCustomer('')
    setPriority('High')
  }

  const startEdit = (ticket: Ticket) => {
    setEditing(ticket)
    setEditStatus(ticket.status)
  }

  const saveEdit = () => {
    if (!editing) return
    setTickets(host.updateTicket(editing.id, { status: editStatus }))
    setEditing(null)
  }

  const deleteTicket = (id: string) => {
    setTickets(host.deleteTicket(id))
  }

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const visible = sortTickets(
    tickets.filter((t) => matchesQuery(t, query) && matchesStatus(t, status)),
    sort,
  )

  const exportCsv = () => {
    const header = ['Subject', 'Customer', 'Priority', 'Status']
    const rows = visible.map((t) => [t.subject, t.customer, t.priority, t.status])
    return toCsv([header, ...rows])
  }

  return (
    <AppShell
      name="Helpdesk"
      icon="inbox"
      hue="gold"
      category="Productivity"
      meta={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
    >
      <Card title="New ticket">
        <FormGrid>
          <div style={gridStyle}>
            <TextInput label="Subject" value={subject} onChange={setSubject} placeholder="What needs help?" />
            <TextInput label="Customer" value={customer} onChange={setCustomer} placeholder="Who is it from?" />
            <Select
              label="Priority"
              value={priority}
              onChange={(value) => setPriority(value as Priority)}
              options={PRIORITIES}
            />
            <Actions>
              <Button kind="primary" onClick={addTicket}>
                Add ticket
              </Button>
            </Actions>
          </div>
        </FormGrid>
      </Card>

      <Card title="Tickets">
        <div style={rowStyle}>
          <TextInput label="Search" value={query} onChange={setQuery} type="search" placeholder="Search tickets" />
          <Button kind={status === 'All' ? 'primary' : 'secondary'} onClick={() => setStatus('All')}>
            All
          </Button>
          <Button kind={status === 'Open' ? 'primary' : 'secondary'} onClick={() => setStatus('Open')}>
            Open
          </Button>
          <Button kind={status === 'Closed' ? 'primary' : 'secondary'} onClick={() => setStatus('Closed')}>
            Closed
          </Button>
          <Button kind="secondary" onClick={() => saveText(exportCsv(), { filename: 'helpdesk.csv', mimeType: 'text/csv' })}>
            Export CSV
          </Button>
        </div>
        {tickets.length === 0 ? (
          <EmptyState
            title="No tickets yet"
            detail="Add your first ticket above and it will appear here."
            actionLabel="Add ticket"
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No matching tickets"
            detail="Try a different search or filter."
            actionLabel="Clear filters"
            onAction={() => {
              setQuery('')
              setStatus('All')
            }}
          />
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {COLUMNS.map((col) => {
                  const active = sort?.key === col.key
                  const arrow = active && sort ? (sort.dir === 'asc' ? '↑' : '↓') : ''
                  return (
                    <th key={col.key} scope="col" style={headerStyle}>
                      <button type="button" style={headerBtnStyle} onClick={() => toggleSort(col.key)}>
                        {col.header}
                        {arrow ? <span aria-hidden>{arrow}</span> : null}
                      </button>
                    </th>
                  )
                })}
                <th scope="col" style={headerStyle}>
                  <span aria-hidden />
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ticket) => (
                <tr key={ticket.id}>
                  <td style={cellStyle}>{ticket.subject}</td>
                  <td style={cellStyle}>{ticket.customer}</td>
                  <td style={cellStyle}>{ticket.priority}</td>
                  <td style={cellStyle}>{ticket.status}</td>
                  <td style={cellStyle}>
                    <span style={{ display: 'inline-flex', gap: 'calc(8px * var(--sf))' }}>
                      <Button onClick={() => startEdit(ticket)}>Edit</Button>
                      <Button kind="danger" onClick={() => deleteTicket(ticket.id)}>
                        Delete
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {editing ? (
          <Card title="Edit ticket" mono={editing.subject} style={{ marginTop: 'calc(12px * var(--sf))' }}>
            <FormGrid>
              <div style={gridStyle}>
                <Select
                  label="Status"
                  value={editStatus}
                  onChange={(value) => setEditStatus(value as Status)}
                  options={STATUSES}
                />
                <Actions>
                  <Button kind="primary" onClick={saveEdit}>
                    Save
                  </Button>
                  <Button onClick={() => setEditing(null)}>Cancel</Button>
                </Actions>
              </div>
            </FormGrid>
          </Card>
        ) : null}
      </Card>
    </AppShell>
  )
}
