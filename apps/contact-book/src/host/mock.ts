import { createMockRecordStore } from '@lacuna/host-mock'

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  notes: string
}

const KEY = 'lacuna.contact-book.mock.v1'

function isContact(v: unknown): v is Contact {
  const c = v as { id?: unknown; name?: unknown; email?: unknown; phone?: unknown; notes?: unknown }
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.email === 'string' &&
    typeof c.phone === 'string' &&
    typeof c.notes === 'string'
  )
}

export const store = createMockRecordStore<Contact>({
  key: KEY,
  validate: isContact,
})
