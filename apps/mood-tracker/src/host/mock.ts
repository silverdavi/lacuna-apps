import { createMockRecordStore } from '@lacuna/host-mock'

export interface MoodEntry {
  id: string
  day: string
  mood: string
  note: string
  createdAt: string
}

export const MOODS = ['Anxious', 'Low', 'Calm', 'Good', 'Great'] as const

const KEY = 'lacuna.mood-tracker.entries'

function isMoodEntry(value: unknown): value is MoodEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Partial<MoodEntry>
  return (
    typeof entry.id === 'string' &&
    typeof entry.day === 'string' &&
    typeof entry.mood === 'string' &&
    typeof entry.note === 'string' &&
    typeof entry.createdAt === 'string'
  )
}

const store = createMockRecordStore<MoodEntry>({
  key: KEY,
  validate: isMoodEntry,
  idPrefix: 'mood-',
})

export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const host = {
  listMoods(): MoodEntry[] {
    return store.list()
  },

  addMood(mood: string, note: string, day: string, createdAt: string): MoodEntry {
    return store.add({ day, mood, note, createdAt })
  },

  deleteMood(id: string): void {
    store.remove(id)
  },
}
