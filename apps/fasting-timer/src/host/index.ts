// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
//
// Fasting Timer persistence. The host bridge is not part of the bundle, so this layer
// persists through the same localStorage the host would use, via @lacuna/host-mock.

import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Fast {
  id: string
  startedAt: number
  endedAt: number
  durationMs: number
}

function isFast(value: unknown): value is Fast {
  const v = value as Partial<Fast> | null
  if (!v || typeof v.id !== 'string') return false
  return typeof v.startedAt === 'number' && typeof v.endedAt === 'number' && typeof v.durationMs === 'number'
}

export const fasts = createMockRecordStore<Fast>({
  key: 'fasting-timer:fasts',
  validate: isFast,
})

export interface Settings {
  targetHours: number
}

export const DEFAULT_SETTINGS: Settings = {
  targetHours: 16,
}

function isSettings(value: unknown): value is Settings {
  const v = value as Partial<Settings> | null
  if (!v || typeof v !== 'object') return false
  return typeof v.targetHours === 'number' && Number.isFinite(v.targetHours) && v.targetHours >= 1 && v.targetHours <= 24
}

export const settings = createMockValue<Settings>({
  key: 'fasting-timer:settings',
  fallback: DEFAULT_SETTINGS,
  validate: isSettings,
})
