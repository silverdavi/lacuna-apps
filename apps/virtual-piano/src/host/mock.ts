// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export type NoteRecord = {
  id: string
  note: string
  time: string
}

function isNoteRecord(value: unknown): value is NoteRecord {
  const v = value as { note?: unknown; time?: unknown }
  return typeof v?.note === 'string' && typeof v?.time === 'string'
}

export type Settings = {
  metronome: boolean
  bpm: number
}

function isSettings(value: unknown): value is Settings {
  const v = value as { metronome?: unknown; bpm?: unknown }
  return typeof v?.metronome === 'boolean' && typeof v?.bpm === 'number' && v.bpm >= 20 && v.bpm <= 400
}

export const notesStore = createMockRecordStore<NoteRecord>({
  key: 'virtual-piano.notes',
  validate: isNoteRecord,
  idPrefix: 'note',
})

export const settingsStore = createMockValue<Settings>({
  key: 'virtual-piano.settings',
  fallback: { metronome: false, bpm: 120 },
  validate: isSettings,
})
