import { store, type Habit } from './mock'

export type { Habit }

export function listHabits(): Habit[] {
  return store.list()
}

export function addHabit(name: string): Habit {
  return store.add({ name, done: [] })
}

export function renameHabit(id: string, name: string) {
  store.update(id, { name })
}

export function deleteHabit(id: string) {
  store.remove(id)
}

export function toggleDay(id: string, day: string) {
  const h = store.get(id)
  if (!h) return
  const has = h.done.includes(day)
  store.update(id, { done: has ? h.done.filter((d) => d !== day) : [...h.done, day] })
}
