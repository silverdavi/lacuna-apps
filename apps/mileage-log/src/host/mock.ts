// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface MileageEntry {
  id: string
  odometer: number
  gallons: number
  cost: number
  note: string
}

const KEY = 'lacuna.mileage-log.entries.v1'

function isEntry(v: unknown): v is MileageEntry {
  const e = v as { id?: unknown; odometer?: unknown; gallons?: unknown; cost?: unknown; note?: unknown }
  return (
    typeof e.id === 'string' &&
    typeof e.odometer === 'number' &&
    Number.isFinite(e.odometer) &&
    typeof e.gallons === 'number' &&
    Number.isFinite(e.gallons) &&
    typeof e.cost === 'number' &&
    Number.isFinite(e.cost) &&
    typeof e.note === 'string'
  )
}

export const store = createMockRecordStore<MileageEntry>({
  key: KEY,
  validate: isEntry,
})
