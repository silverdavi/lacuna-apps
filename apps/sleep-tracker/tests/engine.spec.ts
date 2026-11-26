import { test, expect } from '@playwright/test'
import {
  addEntry,
  averageMinutes,
  computeStreak,
  deleteEntry,
  emptyState,
  formatDuration,
  heatmapCells,
  isQuality,
  isLoggable,
  isValidDate,
  parseDuration,
  sortEntries,
  summarize,
  trendPoints,
} from '../src/engine'

function entry(id: string, date: string, minutes: number, quality: string, createdAt = 0) {
  return { id, date, minutes, quality, createdAt }
}

test('parseDuration handles h/m and bare-minute forms', () => {
  expect(parseDuration('7h 30m')).toBe(450)
  expect(parseDuration('8h')).toBe(480)
  expect(parseDuration('45m')).toBe(45)
  expect(parseDuration('135')).toBe(135)
  expect(parseDuration('  7H 30M  ')).toBe(450)
})

test('parseDuration rejects empty and malformed input', () => {
  expect(parseDuration('')).toBeNull()
  expect(parseDuration('   ')).toBeNull()
  expect(parseDuration('abc')).toBeNull()
  expect(parseDuration('3h 4h')).toBeNull()
  expect(parseDuration('h 30m')).toBeNull()
})

test('isLoggable requires a parseable positive duration', () => {
  expect(isLoggable('7h 30m')).toBe(true)
  expect(isLoggable('0m')).toBe(false)
  expect(isLoggable('')).toBe(false)
  expect(isLoggable('nope')).toBe(false)
})

test('formatDuration renders hours and zero-padded minutes', () => {
  expect(formatDuration(0)).toBe('0h 00m')
  expect(formatDuration(450)).toBe('7h 30m')
  expect(formatDuration(60)).toBe('1h 00m')
  expect(formatDuration(90)).toBe('1h 30m')
})

test('computeStreak counts consecutive days ending at the latest entry', () => {
  expect(computeStreak([])).toBe(0)
  expect(
    computeStreak([entry('1', '2024-01-15', 420, 'Good'), entry('2', '2024-01-16', 375, 'Fair')]),
  ).toBe(2)
  expect(
    computeStreak([
      entry('1', '2024-01-15', 420, 'Good'),
      entry('2', '2024-01-17', 375, 'Fair'),
      entry('3', '2024-01-18', 480, 'Great'),
    ]),
  ).toBe(2)
  // Gap before the latest entry does not extend the streak
  expect(
    computeStreak([
      entry('1', '2024-01-01', 420, 'Good'),
      entry('2', '2024-01-02', 375, 'Fair'),
      entry('3', '2024-01-18', 480, 'Great'),
    ]),
  ).toBe(1)
})

test('averageMinutes rounds to the nearest minute', () => {
  expect(averageMinutes([])).toBe(0)
  expect(averageMinutes([entry('1', '2024-01-15', 450, 'Good')])).toBe(450)
  // mean of 450 and 375 is 412.5 -> rounds to 413 -> 6h 53m
  expect(
    averageMinutes([
      entry('1', '2024-01-15', 450, 'Good'),
      entry('2', '2024-01-16', 375, 'Fair'),
    ]),
  ).toBe(413)
  expect(formatDuration(averageMinutes([entry('1', '2024-01-15', 450, 'Good'), entry('2', '2024-01-16', 375, 'Fair')]))).toBe('6h 53m')
})

test('summarize combines nights, average and streak', () => {
  expect(summarize([])).toEqual({ nights: 0, average: 0, streak: 0 })
  expect(
    summarize([
      entry('1', '2024-01-15', 450, 'Good', 1),
      entry('2', '2024-01-16', 375, 'Fair', 2),
    ]),
  ).toEqual({ nights: 2, average: 413, streak: 2 })
})

test('addEntry appends with the provided id; deleteEntry removes by id', () => {
  const s0 = emptyState()
  const s1 = addEntry(s0, { date: '2024-01-15', minutes: 450, quality: 'Good', createdAt: 1 }, () => 'id-1')
  expect(s1.entries).toHaveLength(1)
  expect(s1.entries[0]).toMatchObject({ id: 'id-1', date: '2024-01-15', minutes: 450, quality: 'Good' })
  // original state is untouched
  expect(s0.entries).toHaveLength(0)

  const s2 = addEntry(s1, { date: '2024-01-16', minutes: 375, quality: 'Fair', createdAt: 2 }, () => 'id-2')
  expect(deleteEntry(s2, 'id-1').entries.map((e) => e.id)).toEqual(['id-2'])
  expect(deleteEntry(s2, 'missing').entries.map((e) => e.id)).toEqual(['id-1', 'id-2'])
})

test('sortEntries orders by date, then createdAt', () => {
  const sorted = sortEntries([
    entry('a', '2024-01-16', 375, 'Fair', 3),
    entry('b', '2024-01-15', 450, 'Good', 2),
    entry('c', '2024-01-15', 400, 'Poor', 1),
  ])
  expect(sorted.map((e) => e.id)).toEqual(['c', 'b', 'a'])
  // input array is not mutated
})

test('heatmapCells dedupes by date, sorts ascending and labels durations', () => {
  expect(heatmapCells([])).toEqual([])
  expect(
    heatmapCells([
      entry('a', '2024-01-16', 375, 'Fair', 2),
      entry('b', '2024-01-15', 450, 'Good', 1),
    ]),
  ).toEqual([
    { date: '2024-01-15', minutes: 450, label: '7h 30m' },
    { date: '2024-01-16', minutes: 375, label: '6h 15m' },
  ])
})

test('trendPoints converts minutes to hours with a display label', () => {
  expect(trendPoints([])).toEqual([])
  expect(trendPoints([entry('a', '2024-01-15', 450, 'Good', 1)])).toEqual([
    { date: '2024-01-15', id: 'a', hours: 7.5, label: '7.5' },
  ])
  expect(
    trendPoints([entry('a', '2024-01-15', 60, 'Good', 1)]).map((p) => p.label),
  ).toEqual(['1'])
})

test('isValidDate and isQuality validate their inputs', () => {
  expect(isValidDate('2024-01-15')).toBe(true)
  expect(isValidDate('2024-1-15')).toBe(false)
  expect(isValidDate('15/01/2024')).toBe(false)
  expect(isQuality('Good')).toBe(true)
  expect(isQuality('great')).toBe(false)
  expect(isQuality('')).toBe(false)
  expect(isQuality(null)).toBe(false)
})
