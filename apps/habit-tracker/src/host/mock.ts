export interface Habit {
  id: string
  name: string
  done: string[]
}

const KEY = 'lacuna.habit-tracker.mock.v1'

let seq = 0

function load(): Habit[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(habits: Habit[]) {
  window.localStorage.setItem(KEY, JSON.stringify(habits))
}

function makeId(): string {
  seq += 1
  return `h-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function toDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const store = {
  list(): Habit[] {
    return load()
  },

  add(name: string): Habit {
    const habits = load()
    const habit: Habit = { id: makeId(), name, done: [] }
    habits.push(habit)
    save(habits)
    return habit
  },

  rename(id: string, name: string) {
    save(load().map((h) => (h.id === id ? { ...h, name } : h)))
  },

  remove(id: string) {
    save(load().filter((h) => h.id !== id))
  },

  toggleDone(id: string, day: string) {
    save(
      load().map((h) => {
        if (h.id !== id) return h
        const has = h.done.includes(day)
        return { ...h, done: has ? h.done.filter((d) => d !== day) : [...h.done, day] }
      }),
    )
  },
}
