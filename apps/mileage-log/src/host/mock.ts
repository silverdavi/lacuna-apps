// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface MileageEntry {
  id: string
  odometer: number
  gallons: number
  cost: number
  note: string
}

export interface EntryInput {
  odometer: number
  gallons: number
  cost: number
  note: string
}

export interface EntryErrors {
  odometer?: string
  gallons?: string
  cost?: string
  note?: string
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

export const LIMITS = {
  odometer: { min: 0, max: 10_000_000 },
  gallons: { min: 0, max: 500 },
  cost: { min: 0, max: 100_000 },
  note: { max: 120 },
} as const

export function validateEntry(input: EntryInput): EntryErrors {
  const errors: EntryErrors = {}
  const { min: oMin, max: oMax } = LIMITS.odometer
  if (!Number.isFinite(input.odometer) || input.odometer < oMin || input.odometer > oMax) {
    errors.odometer = `Odometer must be between ${oMin} and ${oMax.toLocaleString('en-US')}`
  }
  const { min: gMin, max: gMax } = LIMITS.gallons
  if (!Number.isFinite(input.gallons) || input.gallons < gMin || input.gallons > gMax) {
    errors.gallons = `Gallons must be between 0 and ${gMax}`
  }
  const { min: cMin, max: cMax } = LIMITS.cost
  if (!Number.isFinite(input.cost) || input.cost < cMin || input.cost > cMax) {
    errors.cost = `Cost must be between $0.00 and $${cMax.toLocaleString('en-US')}`
  }
  if (input.note.length > LIMITS.note.max) {
    errors.note = `Keep the note under ${LIMITS.note.max} characters`
  }
  return errors
}
