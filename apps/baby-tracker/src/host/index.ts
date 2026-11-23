// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
export type ActivityType = 'Feeding' | 'Sleep' | 'Diaper'

export type Activity = {
  id: string
  type: ActivityType
  timestamp: string
  durationMin: number | null
  notes: string
}

export const KEY = 'baby-tracker-activities'

export function isActivity(v: unknown): v is Activity {
  if (typeof v !== 'object' || v === null) return false
  const a = v as Record<string, unknown>
  if (typeof a.id !== 'string') return false
  if (a.type !== 'Feeding' && a.type !== 'Sleep' && a.type !== 'Diaper') return false
  if (typeof a.timestamp !== 'string') return false
  if (a.durationMin !== null && (typeof a.durationMin !== 'number' || !Number.isFinite(a.durationMin))) return false
  if (typeof a.notes !== 'string') return false
  return true
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `a-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function emptyList(): Activity[] {
  return []
}
