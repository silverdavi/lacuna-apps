// Space-scoped persistence for the subnet calculator.
// The saved list of subnets is kept in the space's mock storage (localStorage)
// so the app works offline. State is rehydrated on load and saved on every
// add or remove.

import { createMockRecordStore } from '@lacuna/host-mock'

export interface SavedSubnet {
  id: string
  ip: string
  prefix: number
}

const KEY = 'lacuna.subnet-calculator.saved'

function isSaved(v: unknown): v is SavedSubnet {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.id === 'string' && typeof r.ip === 'string' && typeof r.prefix === 'number' && Number.isInteger(r.prefix) && r.prefix >= 8 && r.prefix <= 30
}

const store = createMockRecordStore<SavedSubnet>({ key: KEY, validate: isSaved })

export function loadSaved(): SavedSubnet[] {
  return store.list()
}

export function addSaved(ip: string, prefix: number): SavedSubnet[] {
  if (store.list().some((item) => item.ip === ip && item.prefix === prefix)) return store.list()
  store.add({ ip, prefix })
  return store.list()
}

export function removeSaved(id: string): SavedSubnet[] {
  store.remove(id)
  return store.list()
}
