import { loadTickets, saveTickets, type Priority, type Status, type Ticket } from './mock'

export type { Priority, Status, Ticket }

let nextId = 1

function newId(): string {
  return `ticket-${Date.now()}-${nextId++}`
}

export const host = {
  loadTickets(): Ticket[] {
    return loadTickets()
  },
  addTicket(subject: string, customer: string, priority: Priority): Ticket[] {
    const ticket: Ticket = { id: newId(), subject, customer, priority, status: 'Open' }
    const tickets = [...loadTickets(), ticket]
    saveTickets(tickets)
    return tickets
  },
  updateTicket(id: string, patch: Partial<Pick<Ticket, 'subject' | 'customer' | 'priority' | 'status'>>): Ticket[] {
    const tickets = loadTickets().map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket))
    saveTickets(tickets)
    return tickets
  },
  deleteTicket(id: string): Ticket[] {
    const tickets = loadTickets().filter((ticket) => ticket.id !== id)
    saveTickets(tickets)
    return tickets
  },
}
