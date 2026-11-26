// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard']

export type HistoryEntry = {
  id: string
  date: string
  count: number
  score: number
}

export type Settings = {
  difficulty: Difficulty
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  const v = value as { id?: unknown; date?: unknown; count?: unknown; score?: unknown }
  return (
    typeof v?.id === 'string' &&
    typeof v?.date === 'string' &&
    typeof v?.count === 'number' &&
    typeof v?.score === 'number'
  )
}

function isSettings(value: unknown): value is Settings {
  const v = value as { difficulty?: unknown }
  return typeof v?.difficulty === 'string' && (DIFFICULTIES as readonly string[]).includes(v.difficulty)
}

export const historyStore = createMockRecordStore<HistoryEntry>({
  key: 'math-practice.history',
  validate: isHistoryEntry,
  idPrefix: 'session',
})

export const settingsStore = createMockValue<Settings>({
  key: 'math-practice.settings',
  fallback: { difficulty: 'Easy' },
  validate: isSettings,
})
