import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { saveText } from '@lacuna/file-save-open'
import { toCsv } from '@lacuna/csv-parse'
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
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { host, type Priority, type Status, type Ticket } from './host'
import './app.css'

const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']
const STATUSES: Status[] = ['Open', 'Closed']

const PRIORITY_RANK: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 }
const STATUS_RANK: Record<Status, number> = { Open: 0, Closed: 1 }

type SortKey = 'subject' | 'customer' | 'priority' | 'status'

interface SortState {
  key: SortKey
  dir: 'asc' | 'desc'
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

function sortButtonLabel(header: string, active: boolean, dir: 'asc' | 'desc'): ReactNode {
  const arrow = active ? (dir === 'asc' ? ' \u2191' : ' \u2193') : ''
  return header + arrow
}

export function App() {
  const [tickets, setTickets] = useState<Ticket[]>(() => host.loadTickets())

  const [subject, setSubject] = useState('')
  const [customer, setCustomer] = useState('')
  const [priority, setPriority] = useState<Priority>('High')
  const [formError, setFormError] = useState('')

  const [editing, setEditing] = useState<Ticket | null>(null)
  const [editStatus, setEditStatus] = useState<Status>('Open')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All')
  const [sort, setSort] = useState<SortState | null>(null)

  const openCount = tickets.filter((t) => t.status === 'Open').length
  const highCount = tickets.filter((t) => t.priority === 'High' && t.status === 'Open').length

  const visible = sortTickets(
    tickets.filter((t) => matchesQuery(t, query) && matchesStatus(t, statusFilter)),
    sort,
  )

  const addTicket = () => {
    if (!subject.trim() || !customer.trim()) {
      setFormError('Enter a subject and a customer')
      return
    }
    setFormError('')
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

  const exportCsv = () => {
    const header = ['Subject', 'Customer', 'Priority', 'Status']
    const rows = visible.map((t) => [t.subject, t.customer, t.priority, t.status])
    saveText(toCsv([header, ...rows]), { filename: 'helpdesk.csv', mimeType: 'text/csv' })
  }

  const sortLabel = (key: SortKey, header: string) => {
    const active = sort?.key === key
    return active && sort ? sortButtonLabel(header, true, sort.dir) : header
  }

  const columnDefs = (
    key: SortKey,
    header: string,
  ): { key: string; label: ReactNode } => ({
    key,
    label: (
      <button type="button" className="help-sort" onClick={() => toggleSort(key)}>
        {sortLabel(key, header)}
      </button>
    ),
  })

  return (
    <AppShell
      name="Helpdesk"
      icon="inbox"
      hue="gold"
      category="Productivity"
      meta={`${tickets.length} ticket${tickets.length === 1 ? '' : 's'}`}
      status={`${openCount} open`}
      side={
        <Rail
          title="Helpdesk"
          note={`${openCount} open · ${highCount} high priority`}
          chips={['Add', 'Search', 'Sort']}
        />
      }
    >
      <Stack lg>
        <Card
          mono={editing ? 'Edit' : 'New'}
          title={editing ? `Edit ticket: ${editing.subject}` : 'New ticket'}
        >
          <FormGrid>
            <TextInput
              label="Subject"
              value={subject}
              onChange={setSubject}
              placeholder="What needs help?"
              error={formError || null}
            />
            <TextInput
              label="Customer"
              value={customer}
              onChange={setCustomer}
              placeholder="Who is it from?"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(value) => setPriority(value as Priority)}
              options={PRIORITIES}
            />
            {editing && (
              <Select
                label="Status"
                value={editStatus}
                onChange={(value) => setEditStatus(value as Status)}
                options={STATUSES}
              />
            )}
          </FormGrid>
          <Actions>
            {editing ? (
              <>
                <Button kind="primary" onClick={saveEdit}>
                  Save
                </Button>
                <Button kind="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button kind="primary" onClick={addTicket}>
                Add ticket
              </Button>
            )}
          </Actions>
        </Card>

        <KpiRow>
          <Kpi value={String(tickets.length)} label="Total" />
          <Kpi value={String(openCount)} label="Open" accent={openCount > 0} />
          <Kpi value={String(highCount)} label="High priority" accent={highCount > 0} />
        </KpiRow>

        <Card
          mono={`${visible.length} of ${tickets.length} shown`}
          title="Tickets"
        >
          <div className="help-controls">
            <div className="help-search">
              <TextInput
                label="Search"
                type="search"
                value={query}
                onChange={setQuery}
                placeholder="Search tickets"
              />
            </div>
            <div className="help-chips">
              {(['All', 'Open', 'Closed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={statusFilter === s ? 'help-chip on' : 'help-chip'}
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                >
                  {s}
                </button>
              ))}
            </div>
            <Actions>
              <Button kind="secondary" onClick={exportCsv}>
                Export CSV
              </Button>
            </Actions>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No tickets yet"
              detail="Add your first ticket above and it will appear here."
              actionLabel="Add ticket"
            />
          ) : (
            <Table
              label="Tickets"
              columns={[
                columnDefs('subject', 'Subject'),
                columnDefs('customer', 'Customer'),
                columnDefs('priority', 'Priority'),
                columnDefs('status', 'Status'),
                { key: 'actions', label: '' },
              ]}
              rows={visible.map((ticket) => ({
                cells: {
                  subject: ticket.subject,
                  customer: ticket.customer,
                  priority: ticket.priority,
                  status: ticket.status,
                  actions: (
                    <>
                      <Button
                        kind="ghost"
                        ariaLabel={`Edit ${ticket.subject}`}
                        onClick={() => startEdit(ticket)}
                      >
                        Edit
                      </Button>
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${ticket.subject}`}
                        onClick={() => deleteTicket(ticket.id)}
                      >
                        Delete
                      </Button>
                    </>
                  ),
                },
              }))}
              empty="No matching tickets"
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
