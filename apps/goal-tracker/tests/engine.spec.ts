import { expect, test } from '@playwright/test'
import {
  addDays,
  addPastCheckIn,
  checkInToday,
  checkedDays,
  computeStreaks,
  countMap,
  deleteCheckIn,
  emptyState,
  heatLevel,
  fromKey,
  hasCheckIn,
  monthCount,
  monthPrefix,
  ringPct,
  sortCheckIns,
  toKey,
  yearCells,
  yearMonthLabels,
  type CheckIn,
} from '../src/engine'

const NOW = 1_700_000_000_000

const ci = (date: string, count = 1): CheckIn => ({ date, count, goal: 1, createdAt: NOW })

test('empty state has the fixed goal name, daily goal and no check-ins', () => {
  const s = emptyState()
  expect(s.goalName).toBe('My goal')
  expect(s.dailyGoal).toBe(1)
  expect(s.checkIns).toEqual([])
})

test('toKey/fromKey round-trip local dates through padded keys', () => {
  const d = new Date(2023, 9, 5) // October 5, 2023, local
  expect(toKey(d)).toBe('2023-10-05')
  expect(fromKey('2023-10-05').toDateString()).toBe(d.toDateString())
  expect(toKey(new Date(2024, 0, 1))).toBe('2024-01-01')
})

test('addDays rolls across month and year boundaries locally', () => {
  expect(toKey(addDays(new Date(2023, 0, 31), 1))).toBe('2023-02-01')
  expect(toKey(addDays(new Date(2023, 11, 31), 1))).toBe('2024-01-01')
  expect(toKey(addDays(new Date(2023, 11, 31), -1))).toBe('2023-12-30')
  expect(toKey(addDays(new Date(2024, 1, 28), 1))).toBe('2024-02-29') // leap year has a Feb 29
  expect(toKey(addDays(new Date(2023, 1, 28), 1))).toBe('2023-03-01') // non-leap year skips Feb 29
})

test('computeStreaks on an empty set is 0/0', () => {
  expect(computeStreaks(new Set())).toEqual({ current: 0, longest: 0 })
  expect(computeStreaks([])).toEqual({ current: 0, longest: 0 })
})

test('computeStreaks on one day is 1/1 (edge: single run)', () => {
  expect(computeStreaks(new Set(['2023-10-15']))).toEqual({ current: 1, longest: 1 })
})

test('computeStreaks: three consecutive days are current and longest 3', () => {
  const dates = ['2023-10-15', '2023-10-16', '2023-10-17']
  expect(computeStreaks(new Set(dates))).toEqual({ current: 3, longest: 3 })
})

test('computeStreaks: a gap breaks the run; current counts from the newest run', () => {
  const dates = ['2023-10-15', '2023-10-16', '2023-10-17', '2023-10-20', '2023-10-21']
  expect(computeStreaks(new Set(dates))).toEqual({ current: 2, longest: 3 })
})

test('computeStreaks: unsorted input still gives the right runs', () => {
  const dates = ['2023-10-17', '2023-10-15', '2023-10-21', '2023-10-16', '2023-10-20']
  expect(computeStreaks(dates)).toEqual({ current: 2, longest: 3 })
})

test('computeStreaks: a non-consecutive pair is two runs of one, not one run of two', () => {
  expect(computeStreaks(new Set(['2023-10-15', '2023-10-17']))).toEqual({ current: 1, longest: 1 })
})

test('heatLevel buckets by count', () => {
  expect(heatLevel(0)).toBe('empty')
  expect(heatLevel(1)).toBe('low')
  expect(heatLevel(2)).toBe('mid')
  expect(heatLevel(3)).toBe('high')
  expect(heatLevel(99)).toBe('high')
})

test('checkInToday appends today exactly once (idempotent repeat)', () => {
  let s = emptyState()
  s = checkInToday(s, '2023-10-15', NOW)
  expect(s.checkIns).toEqual([{ date: '2023-10-15', count: 1, goal: 1, createdAt: NOW }])
  const twice = checkInToday(s, '2023-10-15', NOW + 1)
  expect(twice).toBe(s) // unchanged reference: no duplicate entry
})

test('addPastCheckIn replaces the same-date entry rather than duplicating', () => {
  let s = emptyState()
  s = addPastCheckIn(s, '2023-10-15', 1, NOW)
  s = addPastCheckIn(s, '2023-10-15', 2, NOW + 1)
  expect(s.checkIns).toEqual([{ date: '2023-10-15', count: 2, goal: 1, createdAt: NOW + 1 }])
})

test('deleteCheckIn removes only the named date and keeps the rest ordered', () => {
  let s = emptyState()
  s = addPastCheckIn(s, '2023-10-14', 1, NOW)
  s = addPastCheckIn(s, '2023-10-15', 1, NOW + 1)
  s = addPastCheckIn(s, '2023-10-16', 1, NOW + 2)
  s = deleteCheckIn(s, '2023-10-15')
  expect(s.checkIns.map((c) => c.date)).toEqual(['2023-10-14', '2023-10-16'])
})

test('monthPrefix tracks October 2023 once any 2023 check-in exists, else the current month', () => {
  const s = emptyState()
  expect(monthPrefix(s.checkIns, '2026-11-21')).toEqual({ prefix: '2026-11', label: 'This month' })
  const withPast = addPastCheckIn(s, '2023-10-15', 1, NOW)
  expect(monthPrefix(withPast.checkIns, '2026-11-21')).toEqual({ prefix: '2023-10', label: 'Oct 2023' })
  // a non-October 2023 check-in still moves the tracked month to Oct 2023
  const withJan = addPastCheckIn(s, '2023-01-10', 1, NOW)
  expect(monthPrefix(withJan.checkIns, '2026-11-21')).toEqual({ prefix: '2023-10', label: 'Oct 2023' })
})

test('monthCount sums counts for the tracked month only', () => {
  const s = [
    ci('2023-10-01', 1),
    ci('2023-10-02', 2),
    ci('2023-11-01', 5),
    ci('2022-10-01', 9),
  ]
  expect(monthCount(s, '2023-10')).toBe(3)
  expect(monthCount(s, '2023-11')).toBe(5)
  expect(monthCount(s, '2022-10')).toBe(9)
  expect(monthCount([], '2023-10')).toBe(0)
})

test('ringPct is 0 at zero, exact at mid-month and clamped at and above the max', () => {
  expect(ringPct(0, 30)).toBe(0)
  expect(ringPct(15, 30)).toBe(50)
  expect(ringPct(30, 30)).toBe(100)
  expect(ringPct(45, 30)).toBe(100)
  expect(ringPct(5, 0)).toBe(0) // guard: never divide by zero
})

test('yearCells renders exactly the 365 days of 2023 and picks up their counts', () => {
  const counts = countMap([ci('2023-01-01', 1), ci('2023-10-15', 1), ci('2023-12-31', 1)])
  const cells = yearCells(2023, counts)
  expect(cells.length).toBe(365)
  expect(cells[0].key).toBe('2023-01-01')
  expect(cells[cells.length - 1].key).toBe('2023-12-31')
  const jan = cells.find((c) => c.key === '2023-01-01')
  const dec = cells.find((c) => c.key === '2023-12-31')
  const oct = cells.find((c) => c.key === '2023-10-15')
  expect(jan?.count).toBe(1)
  expect(dec?.count).toBe(1)
  expect(oct?.count).toBe(1)
  // empty days stay at 0
  expect(cells.find((c) => c.key === '2023-06-15')?.count).toBe(0)
})

test('yearMonthLabels marks the first day of each month, in order', () => {
  const labels = yearMonthLabels(2023)
  expect(labels.map((l) => l.label)).toEqual([
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ])
  // indices are day indices from the start of the year (Jan 1 is day 0)
  expect(labels.map((l) => l.index)).toEqual([0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334])
})

test('sortCheckIns sorts newest-first and keeps check-ins of the same date stable', () => {
  const items = [ci('2023-10-15', 1, NOW), ci('2023-10-20', 1, NOW + 1), ci('2023-10-01', 1, NOW + 2)]
  expect(sortCheckIns(items).map((c) => c.date)).toEqual(['2023-10-20', '2023-10-15', '2023-10-01'])
  expect(sortCheckIns([])).toEqual([])
})

test('countMap and checkedDays derive the set of filled days', () => {
  const map = countMap([ci('2023-10-15', 1), ci('2023-10-16', 2), ci('2023-10-17', 0)])
  expect(map.get('2023-10-15')).toBe(1)
  expect(map.get('2023-10-16')).toBe(2)
  const checked = checkedDays(map)
  expect(checked.has('2023-10-15')).toBe(true)
  expect(checked.has('2023-10-16')).toBe(true)
  expect(checked.has('2023-10-17')).toBe(false) // count 0 is not a checked day
  expect(checked.size).toBe(2)
})

test('hasCheckIn is true only for exact date matches', () => {
  const s = [ci('2023-10-15', 1)]
  expect(hasCheckIn(s, '2023-10-15')).toBe(true)
  expect(hasCheckIn(s, '2023-10-16')).toBe(false)
  expect(hasCheckIn(s, '2023-01-15')).toBe(false)
  expect(hasCheckIn([], '2023-10-15')).toBe(false)
})
