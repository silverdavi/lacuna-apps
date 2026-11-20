export interface MoodEntry {
  id: string
  day: string
  mood: string
  note: string
  createdAt: string
}

export const MOODS = ['Anxious', 'Low', 'Calm', 'Good', 'Great'] as const

const KEY = 'lacuna.mood-tracker.entries'

let counter = 0

function nextId(): string {
  counter += 1
  return `mood-${Date.now().toString(36)}-${counter}`
}

function load(): MoodEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is MoodEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as MoodEntry).id === 'string' &&
        typeof (entry as MoodEntry).day === 'string' &&
        typeof (entry as MoodEntry).mood === 'string',
    )
  } catch {
    return []
  }
}

function save(entries: MoodEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
}

export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const host = {
  listMoods(): MoodEntry[] {
    return load()
  },

  addMood(mood: string, note: string, day: string, createdAt: string): MoodEntry {
    const entry: MoodEntry = { id: nextId(), day, mood, note, createdAt }
    const entries = load()
    entries.push(entry)
    save(entries)
    return entry
  },

  deleteMood(id: string): void {
    save(load().filter((entry) => entry.id !== id))
  },
}
