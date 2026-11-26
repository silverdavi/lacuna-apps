// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/ics-calendar 0.1.0: snapshot of lacuna-components icsCalendar at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export interface IcsEvent {
  id: string
  summary: string
  description?: string
  startDate: string
  endDate?: string
  allDay: boolean
  location?: string
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    maxOccurrences?: number
    endDate?: string
  }
}

type IcsRecurrence = NonNullable<IcsEvent['recurrence']>
type IcsFrequency = IcsRecurrence['frequency']

const PRODID = '-//lacuna//icsCalendar//EN'
const FREQ_TO_RRULE: Record<IcsFrequency, string> = {
  daily: 'DAILY',
  weekly: 'WEEKLY',
  monthly: 'MONTHLY',
  yearly: 'YEARLY',
}
const FREQ_BY_RRULE: Record<string, IcsFrequency> = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function unescapeIcs(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === '\\' && i + 1 < value.length) {
      const next = value[i + 1]
      if (next === 'n' || next === 'N') {
        out += '\n'
      } else if (next === 't' || next === 'T') {
        out += ' '
      } else if (next === 'r') {
        // carriage return is dropped, not converted
      } else {
        out += next
      }
      i += 1
    } else {
      out += ch
    }
  }
  return out
}

function compactISO(value: string): string {
  return value.replace(/[-:]/g, '')
}

function timedCompact(value: string): string {
  const compact = compactISO(value)
  return compact.indexOf('T') === -1 ? compact.slice(0, 8) + 'T000000' : compact
}

function compactToISODate(compact: string): string {
  const y = compact.slice(0, 4)
  const m = compact.slice(4, 6)
  const d = compact.slice(6, 8)
  return `${y}-${m}-${d}`
}

function lineValue(line: string): string {
  const idx = line.indexOf(':')
  return idx === -1 ? '' : line.slice(idx + 1)
}

function lineParams(line: string): Record<string, string> {
  const head = line.slice(0, line.indexOf(':'))
  const params: Record<string, string> = {}
  for (const part of head.split(';').slice(1)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1)
  }
  return params
}

function eventFromLines(lines: string[], index: number): IcsEvent | null {
  if (lines[index] === undefined || lines[index] !== 'BEGIN:VEVENT') return null
  const event: IcsEvent = { id: '', summary: '', startDate: '', allDay: false }
  let allDay: boolean | undefined
  let seenEnd = false
  let i = index + 1
  for (; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (line === 'END:VEVENT') {
      seenEnd = true
      break
    }
    const colon = line.indexOf(':')
    if (colon === -1) continue
    const head = line.slice(0, colon)
    const name = head.split(';')[0] ?? ''
    const value = unescapeIcs(line.slice(colon + 1))
    switch (name) {
      case 'UID':
        event.id = value
        break
      case 'SUMMARY':
        event.summary = value
        break
      case 'DESCRIPTION':
        event.description = value
        break
      case 'LOCATION':
        event.location = value
        break
      case 'DTSTART':
        event.startDate = parseDateValue(line)
        allDay = lineParams(line)['VALUE'] === 'DATE'
        break
      case 'DTEND':
        event.endDate = parseDateValue(line)
        break
      case 'RRULE':
        try {
          event.recurrence = rruleToIcsRec(value)
        } catch {
          // an unparseable RRULE is dropped rather than failing the whole import
        }
        break
    }
  }
  if (!seenEnd) return null
  event.allDay = allDay === true
  return event
}

function parseDateValue(line: string): string {
  const params = lineParams(line)
  const value = lineValue(line)
  const compact = compactISO(value)
  if (params['VALUE'] === 'DATE' || compact.indexOf('T') === -1) return compactToISODate(compact.slice(0, 8))
  return `${compactToISODate(compact.slice(0, 8))}T${compact.slice(9, 11)}:${compact.slice(11, 13)}:${compact.slice(13, 15)}`
}

const CRLF = '\r\n'

function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let rest = line
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75))
    rest = ' ' + rest.slice(75)
  }
  chunks.push(rest)
  return chunks.join(CRLF)
}

export function toIcs(events: IcsEvent[]): string {
  const out: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${PRODID}`]
  for (const event of events) {
    out.push('BEGIN:VEVENT', `UID:${event.id}`, `SUMMARY:${escapeIcs(event.summary)}`)
    if (event.description !== undefined && event.description !== '') {
      out.push(`DESCRIPTION:${escapeIcs(event.description)}`)
    }
    if (event.allDay) {
      out.push(`DTSTART;VALUE=DATE:${compactISO(event.startDate)}`)
      if (event.endDate !== undefined) out.push(`DTEND;VALUE=DATE:${compactISO(event.endDate)}`)
    } else {
      out.push(`DTSTART:${timedCompact(event.startDate)}`)
      if (event.endDate !== undefined) out.push(`DTEND:${timedCompact(event.endDate)}`)
    }
    if (event.location !== undefined && event.location !== '') {
      out.push(`LOCATION:${escapeIcs(event.location)}`)
    }
    if (event.recurrence !== undefined) out.push(`RRULE:${icsToRRule(event.recurrence)}`)
    out.push('END:VEVENT')
  }
  out.push('END:VCALENDAR')
  return out.map(foldLine).join(CRLF) + CRLF
}

function unfoldLines(raw: string): string[] {
  const physical = raw.split(/\r\n|\n/).filter((line) => line.trim() !== '')
  const lines: string[] = []
  for (const line of physical) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

export type IcsEventList = [IcsEvent, ...IcsEvent[]]

export function fromIcs(text: string): IcsEventList {
  const lines = unfoldLines(text)
  const events: IcsEvent[] = []
  for (let i = 0; i < lines.length; i++) {
    const event = eventFromLines(lines, i)
    if (event === null) continue
    const end = lines.indexOf('END:VEVENT', i)
    i = end === -1 ? lines.length : end
    events.push(event)
  }
  return events as unknown as IcsEventList
}

export function validateIcs(text: string): boolean {
  const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return false
  if (lines[0] !== 'BEGIN:VCALENDAR') return false
  if (lines[lines.length - 1] !== 'END:VCALENDAR') return false
  let depth = 0
  for (const line of lines) {
    if (line === 'BEGIN:VCALENDAR') {
      depth += 1
      continue
    }
    if (line === 'END:VCALENDAR') {
      depth -= 1
      if (depth < 0) return false
      continue
    }
    if (line === 'BEGIN:VEVENT') {
      depth += 1
      continue
    }
    if (line === 'END:VEVENT') {
      depth -= 1
      if (depth < 0) return false
    }
  }
  return depth === 0
}

export function icsToRRule(rec: IcsRecurrence): string {
  const parts: string[] = [`FREQ=${FREQ_TO_RRULE[rec.frequency]}`, `INTERVAL=${rec.interval}`]
  if (rec.maxOccurrences !== undefined) parts.push(`COUNT=${rec.maxOccurrences}`)
  if (rec.endDate !== undefined) parts.push(`UNTIL=${compactISO(rec.endDate)}`)
  return parts.join(';')
}

export function rruleToIcsRec(rrule: string): IcsRecurrence {
  const base = rrule.startsWith('RRULE:') ? rrule.slice('RRULE:'.length) : rrule
  const values: Record<string, string> = {}
  for (const part of base.split(';')) {
    if (part.trim() === '') continue
    const eq = part.indexOf('=')
    if (eq === -1) throw new Error('Invalid RRULE: missing "=" in part')
    const key = part.slice(0, eq).trim().toUpperCase()
    const value = part.slice(eq + 1).trim()
    if (key === '' || value === '') throw new Error('Invalid RRULE: empty key or value')
    values[key] = value
  }
  const freqRaw = values['FREQ']
  const frequency = freqRaw !== undefined ? FREQ_BY_RRULE[freqRaw] : undefined
  if (frequency === undefined) throw new Error('Invalid RRULE: FREQ is required')
  const intervalRaw = values['INTERVAL']
  const interval = intervalRaw === undefined ? 1 : Number(intervalRaw)
  if (!Number.isInteger(interval) || interval < 1) throw new Error('Invalid RRULE: INTERVAL must be a positive integer')
  const rec: IcsRecurrence = { frequency, interval }
  const countRaw = values['COUNT']
  if (countRaw !== undefined) {
    const count = Number(countRaw)
    if (!Number.isInteger(count) || count < 1) throw new Error('Invalid RRULE: COUNT must be a positive integer')
    rec.maxOccurrences = count
  }
  const untilRaw = values['UNTIL']
  if (untilRaw !== undefined) {
    const compact = compactISO(untilRaw)
    if (!/^\d{8}/.test(compact)) throw new Error('Invalid RRULE: UNTIL must be a DATE or DATE-TIME')
    rec.endDate = compactToISODate(compact.slice(0, 8))
  }
  return rec
}
