import { expect, test } from '@playwright/test'
import { dayKey, isDone, lastSeven, rename, remove, streak, toggleDone, validateName, type Habit } from '../src/engine'

const TODAY = new Date(2026, 10, 21)

function daysAgo(n: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return dayKey(d)
}

function habit(name: string, done: string[] = []): Habit {
  return { id: 'h-1', name, done }
}

test('dayKey formats a local calendar date as YYYY-MM-DD', () => {
  expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  expect(dayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
})

test('lastSeven returns seven cells oldest first with the right labels', () => {
  const days = lastSeven(TODAY)
  expect(days).toHaveLength(7)
  expect(days.map((d) => d.label)).toEqual([
    '6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', '1 day ago', 'Today',
  ])
  expect(days[6].key).toBe(dayKey(TODAY))
  expect(days[0].key).toBe(daysAgo(6))
})

test('validateName rejects empty and blank names', () => {
  expect(validateName('', [])).toBe('Enter a habit name.')
  expect(validateName('   ', [])).toBe('Enter a habit name.')
})

test('validateName rejects a duplicate, case-insensitively, and accepts a new name', () => {
  const habits = [habit('Read')]
  expect(validateName('read', habits)).toBe('That habit already exists.')
  expect(validateName('Read ', habits)).toBe('That habit already exists.')
  expect(validateName('Read daily', habits)).toBe('')
})

test('isDone reports membership in the habit ticks', () => {
  const h = habit('Read', [daysAgo(1)])
  expect(isDone(h, daysAgo(1))).toBe(true)
  expect(isDone(h, daysAgo(2))).toBe(false)
})

test('streak counts back from Today when Today is ticked', () => {
  const h = habit('Read', [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)])
  expect(streak(h, TODAY)).toBe(4)
  expect(streak(habit('Read', [daysAgo(0)]), TODAY)).toBe(1)
})

test('streak starts at 1 day ago when Today is not ticked', () => {
  const h = habit('Read', [daysAgo(1), daysAgo(2), daysAgo(3)])
  expect(streak(h, TODAY)).toBe(3)
})

test('streak is 0 when Today and 1 day ago are unticked, even with older ticks', () => {
  const h = habit('Read', [daysAgo(2), daysAgo(3)])
  expect(streak(h, TODAY)).toBe(0)
})

test('streak is 0 when nothing is ticked', () => {
  expect(streak(habit('Read'), TODAY)).toBe(0)
})

test('streak stops at the first gap', () => {
  const h = habit('Read', [daysAgo(0), daysAgo(1), daysAgo(3)])
  expect(streak(h, TODAY)).toBe(2)
})

test('toggleDone adds a missing tick and removes an existing one, leaving other habits alone', () => {
  const a = habit('Read', [])
  const b = habit('Meditate', [daysAgo(1)])
  const withTick = toggleDone([a, b], 'h-1', daysAgo(0))
  expect(withTick[0].done).toEqual([daysAgo(0)])
  const withoutTick = toggleDone(withTick, 'h-1', daysAgo(0))
  expect(withoutTick[0].done).toEqual([])
  expect(withoutTick[1].done).toEqual([daysAgo(1)])
})

test('rename changes the name and trims it; blank names are a no-op', () => {
  const habits = [habit('Read', [daysAgo(0)]), { id: 'h-2', name: 'Meditate', done: [] }]
  const renamed = rename(habits, 'h-1', 'Read daily')
  expect(renamed[0].name).toBe('Read daily')
  expect(renamed[0].done).toEqual([daysAgo(0)])
  expect(renamed[1].name).toBe('Meditate')
  expect(rename(habits, 'h-1', '   ')).toEqual(habits)
  expect(rename(habits, 'nope', 'X')).toEqual(habits)
})

test('remove deletes the habit and keeps the rest', () => {
  const habits = [habit('Read'), { id: 'h-2', name: 'Meditate', done: [] }]
  expect(remove(habits, 'h-1')).toEqual([habits[1]])
  expect(remove(habits, 'nope')).toEqual(habits)
})
