import { store, toDay, type Habit } from './mock'

export type { Habit }

export function listHabits(): Habit[] {
  return store.list()
}

export function addHabit(name: string): Habit {
  return store.add(name)
}

export function renameHabit(id: string, name: string) {
  store.rename(id, name)
}

export function deleteHabit(id: string) {
  store.remove(id)
}

export function toggleDay(id: string, day: string) {
  store.toggleDone(id, day)
}

export function dayKey(d: Date): string {
  return toDay(d)
}

export function isDone(habit: Habit, day: string): boolean {
  return habit.done.includes(day)
}

export function streak(habit: Habit, today: Date): number {
  let n = 0
  const d = new Date(today)
  if (habit.done.includes(toDay(d))) n += 1
  for (;;) {
    d.setDate(d.getDate() - 1)
    if (habit.done.includes(toDay(d))) n += 1
    else break
  }
  return n
}
