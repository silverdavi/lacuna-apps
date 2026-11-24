import { store, type Contact } from './mock'

export type { Contact }

export function listContacts(): Contact[] {
  return store.list()
}

export function addContact(name: string, email: string, phone: string, notes: string): Contact {
  return store.add({ name, email, phone, notes })
}

export function updateContact(id: string, patch: Partial<Omit<Contact, 'id'>>) {
  store.update(id, patch)
}

export function removeContact(id: string) {
  store.remove(id)
}
