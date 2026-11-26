// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mock host backed by the @lacuna/host-mock localStorage store.
import { createMockRecordStore } from '@lacuna/host-mock'
import { addDays, fromISODate, startOfDay } from '@lacuna/date-math'

export type Warranty = {
  id: string
  name: string
  purchase: string
  end: string
}

export type WarrantyStatus = 'active' | 'expiring' | 'expired'

export function isWarranty(value: unknown): value is Warranty {
  const v = value as Warranty | null
  return (
    v != null &&
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.name === 'string' &&
    v.name.length > 0 &&
    typeof v.purchase === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.purchase) &&
    typeof v.end === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.end)
  )
}

export function createWarrantyStore() {
  return createMockRecordStore<Warranty>({
    key: 'lacuna.warranty-tracker.records',
    validate: isWarranty,
    idPrefix: 'wty',
  })
}

export const REFERENCE_TODAY = new Date('2024-11-01T00:00:00')

export function statusOf(warranty: Pick<Warranty, 'end'>, today: Date = REFERENCE_TODAY): WarrantyStatus {
  const end = fromISODate(warranty.end)
  if (end == null) return 'active'
  const start = startOfDay(today)
  if (end.getTime() < start.getTime()) return 'expired'
  const horizon = addDays(start, 90).getTime()
  return end.getTime() < horizon ? 'expiring' : 'active'
}

export function statusLabel(status: WarrantyStatus): string {
  return status === 'active' ? 'Active' : status === 'expiring' ? 'Expiring' : 'Expired'
}
