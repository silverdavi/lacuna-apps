import { createMockRecordStore } from '@lacuna/host-mock'
import type { BudgetRecord, EventRecord, PackingRecord } from './types'

export function isEventRecord(value: unknown): value is EventRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.title === 'string' &&
    typeof v.date === 'string' &&
    typeof v.startTime === 'string'
  )
}

export function isBudgetRecord(value: unknown): value is BudgetRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.item === 'string' &&
    typeof v.amount === 'number' &&
    Number.isFinite(v.amount)
  )
}

export function isPackingRecord(value: unknown): value is PackingRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.name === 'string' &&
    typeof v.packed === 'boolean'
  )
}

export const eventsStore = createMockRecordStore<EventRecord>({
  key: 'lacuna.travel-planner.events',
  validate: isEventRecord,
})

export const budgetStore = createMockRecordStore<BudgetRecord>({
  key: 'lacuna.travel-planner.budget',
  validate: isBudgetRecord,
})

export const packingStore = createMockRecordStore<PackingRecord>({
  key: 'lacuna.travel-planner.packing',
  validate: isPackingRecord,
})
