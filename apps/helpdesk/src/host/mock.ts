import { createMockRecordStore } from '@lacuna/host-mock'

export type Priority = 'High' | 'Medium' | 'Low'
export type Status = 'Open' | 'Closed'

export interface Ticket {
  id: string
  subject: string
  customer: string
  priority: Priority
  status: Status
}

const KEY = 'lacuna.helpdesk.tickets'

export function isTicket(value: unknown): value is Ticket {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.subject === 'string' &&
    typeof v.customer === 'string' &&
    (v.priority === 'High' || v.priority === 'Medium' || v.priority === 'Low') &&
    (v.status === 'Open' || v.status === 'Closed')
  )
}

export const store = createMockRecordStore<Ticket>({
  key: KEY,
  validate: isTicket,
})

export function loadTickets(): Ticket[] {
  return store.list()
}

export function saveTickets(tickets: Ticket[]): void {
  store.replaceAll(tickets)
}
