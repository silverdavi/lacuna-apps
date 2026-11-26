// Adapter for @lacuna/host-mock: localStorage-backed stores so packing-list items
// and trip details survive a reload. All host calls live behind this one file.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type PackItem = {
  id: string
  name: string
  checked: boolean
}

export type TripDetails = {
  destination: string
  departureDate: string
}

export const packStore = createMockRecordStore<PackItem>({
  key: 'lacuna.packing-list.items',
  idPrefix: 'pack',
  validate: (v: unknown): v is PackItem => {
    const i = v as Partial<PackItem> | null
    return (
      !!i &&
      typeof i.id === 'string' &&
      typeof i.name === 'string' &&
      typeof i.checked === 'boolean'
    )
  },
})

export const tripStore = createMockValue<TripDetails>({
  key: 'lacuna.packing-list.trip',
  fallback: { destination: '', departureDate: '' },
  validate: (v: unknown): v is TripDetails => {
    const t = v as Partial<TripDetails> | null
    return !!t && typeof t.destination === 'string' && typeof t.departureDate === 'string'
  },
})
