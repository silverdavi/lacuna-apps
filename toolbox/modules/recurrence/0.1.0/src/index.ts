// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/recurrence 0.1.0: snapshot of lacuna-components recurrence at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { addDays, addMonths, fromISODate, toISODate } from '@lacuna/date-math'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval: number
  startDate: string
  endDate?: string
  maxOccurrences?: number
}

const FREQ_BY_KEY: Record<string, RecurrenceFrequency> = {
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
  yearly: 'yearly',
}

const FREQ_TO_RRULE: Record<RecurrenceFrequency, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
}

// The date of the n-th occurrence of a rule, counting from its (possibly
// clamped) start date. Each occurrence is derived from the original anchor so
// that end-of-month and leap-day clamping applies to every period: a rule that
// starts on Jan 31 reads as Jan 31, Feb 29 (clamped), Mar 31 (restored), and a
// rule that starts on Feb 29 reads as Feb 29, then Feb 28 in each later year.
function occurrenceAt(anchor: Date, rule: RecurrenceRule, n: number): Date {
  switch (rule.frequency) {
    case 'daily':
      return addDays(anchor, n * rule.interval)
    case 'weekly':
      return addDays(anchor, n * rule.interval * 7)
    case 'monthly':
      return addMonths(anchor, n * rule.interval)
    case 'yearly':
      return addMonths(anchor, n * rule.interval * 12)
  }
}

function occurrenceISO(anchor: Date, rule: RecurrenceRule, n: number): string {
  return toISODate(occurrenceAt(anchor, rule, n))
}

function stepISOs(anchor: Date, rule: RecurrenceRule, max: number, endISO?: string): string[] {
  const out: string[] = []
  for (let n = 0; n < max; n++) {
    const iso = occurrenceISO(anchor, rule, n)
    if (endISO !== undefined && iso > endISO) break
    out.push(iso)
  }
  return out
}

function isOnGrid(anchor: Date, rule: RecurrenceRule, target: Date, targetISO: string, endISO?: string): boolean {
  const t = target.getTime()
  for (let n = 0; n < 1_000_000; n++) {
    const d = occurrenceAt(anchor, rule, n)
    if (d.getTime() === t) return true
    if (d.getTime() > t) return false
    if (endISO !== undefined && occurrenceISO(anchor, rule, n) > endISO) return false
  }
  return false
}

function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function parseRule(input: string): RecurrenceRule {
  const parts = input.split(';').filter((p) => p.trim() !== '')
  if (parts.length === 0) throw new Error('Invalid recurrence rule')

  const values = new Map<string, string>()
  for (const part of parts) {
    const eq = part.indexOf('=')
    if (eq === -1) throw new Error('Invalid recurrence rule')
    const key = part.slice(0, eq).trim().toUpperCase()
    const value = part.slice(eq + 1).trim()
    if (key === '' || value === '') throw new Error('Invalid recurrence rule')
    values.set(key, value)
  }

  const freqRaw = values.get('FREQ')
  const freq = freqRaw ? FREQ_BY_KEY[freqRaw.toLowerCase()] : undefined
  if (!freq) throw new Error('Invalid recurrence rule')

  const intervalRaw = values.get('INTERVAL')
  const interval = intervalRaw === undefined ? 1 : Number(intervalRaw)
  if (!Number.isInteger(interval) || interval < 1) throw new Error('Invalid recurrence rule')

  const startRaw = values.get('START')
  const start = startRaw ? fromISODate(startRaw) : null
  if (startRaw && start === null) throw new Error('Invalid recurrence rule')

  const rule: RecurrenceRule = {
    frequency: freq,
    interval,
    startDate: start ? toISODate(start) : startRaw!,
  }

  const endRaw = values.get('END')
  if (endRaw !== undefined) {
    const end = fromISODate(endRaw)
    if (end === null) throw new Error('Invalid recurrence rule')
    rule.endDate = toISODate(end)
  }

  const countRaw = values.get('COUNT')
  if (countRaw !== undefined) {
    const count = Number(countRaw)
    if (!Number.isInteger(count) || count < 1) throw new Error('Invalid recurrence rule')
    rule.maxOccurrences = count
  }

  return rule
}

function firstDate(rule: RecurrenceRule): Date | null {
  return fromISODate(rule.startDate)
}

export function nextOccurrences(rule: RecurrenceRule, count: number): string[] {
  const anchor = firstDate(rule)
  if (anchor === null || count <= 0) return []

  const limit =
    rule.maxOccurrences !== undefined ? Math.min(rule.maxOccurrences, count) : count

  return stepISOs(anchor, rule, limit, rule.endDate)
}

export function isRecurring(rule: RecurrenceRule, date: string): boolean {
  const target = fromISODate(date)
  if (target === null) return false
  const anchor = firstDate(rule)
  if (anchor === null) return false

  if (date < rule.startDate) return false
  if (rule.endDate !== undefined && date > rule.endDate) return false

  return isOnGrid(anchor, rule, target, date, rule.endDate)
}

export function occurrencesBetween(rule: RecurrenceRule, from: string, to: string): string[] {
  const fromD = fromISODate(from)
  const toD = fromISODate(to)
  if (fromD === null || toD === null) return []
  if (compareISO(from, to) > 0) return []

  const endISO =
    rule.endDate !== undefined && compareISO(rule.endDate, to) < 0 ? rule.endDate : to

  const all = nextOccurrences({ ...rule, endDate: endISO }, 1_000_000)
  return all.filter((iso) => iso >= from && iso <= to)
}

export function ruleToRRule(rule: RecurrenceRule): string {
  const parts: string[] = [
    `FREQ=${FREQ_TO_RRULE[rule.frequency]}`,
    `INTERVAL=${rule.interval}`,
  ]
  if (rule.maxOccurrences !== undefined) parts.push(`COUNT=${rule.maxOccurrences}`)
  return parts.join(';')
}

export function rruleToRule(rrule: string, startDate: string): RecurrenceRule {
  const start = fromISODate(startDate)
  if (start === null) throw new Error('Invalid recurrence rule')

  const base = rrule.startsWith('RRULE:') ? rrule.slice('RRULE:'.length) : rrule
  const values = new Map<string, string>()
  for (const part of base.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) throw new Error('Invalid recurrence rule')
    const key = part.slice(0, eq).trim().toUpperCase()
    const value = part.slice(eq + 1).trim()
    values.set(key, value)
  }

  const freqRaw = values.get('FREQ')
  const freq = freqRaw ? FREQ_BY_KEY[freqRaw.toLowerCase()] : undefined
  if (!freq) throw new Error('Invalid recurrence rule')

  const intervalRaw = values.get('INTERVAL')
  const interval = intervalRaw === undefined ? 1 : Number(intervalRaw)
  if (!Number.isInteger(interval) || interval < 1) throw new Error('Invalid recurrence rule')

  const rule: RecurrenceRule = {
    frequency: freq,
    interval,
    startDate: toISODate(start),
  }

  const countRaw = values.get('COUNT')
  if (countRaw !== undefined) {
    const count = Number(countRaw)
    if (!Number.isInteger(count) || count < 1) throw new Error('Invalid recurrence rule')
    rule.maxOccurrences = count
  }

  const untilRaw = values.get('UNTIL')
  if (untilRaw !== undefined) {
    const end = fromISODate(untilRaw)
    if (end === null) throw new Error('Invalid recurrence rule')
    rule.endDate = toISODate(end)
  }

  return rule
}

