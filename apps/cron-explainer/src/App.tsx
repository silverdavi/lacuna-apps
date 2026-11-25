import { useEffect, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  Checkbox,
  FormGrid,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { cronStore } from './host'

const OCCURRENCE_COUNT = 5
const pad2 = (n: number) => String(n).padStart(2, '0')

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function parseField(field: string, min: number, max: number, step = 1): Set<number> | null {
  const values = new Set<number>()
  for (const rawPart of field.split(',')) {
    if (rawPart === '') return null
    let part = rawPart
    let stride = step
    if (part.includes('/')) {
      const [base, stepText] = part.split('/')
      const parsed = Number(stepText)
      if (!Number.isInteger(parsed) || parsed < 1) return null
      stride = parsed
      part = base
    }
    let lo: number
    let hi: number
    if (part === '*') {
      lo = min
      hi = max
    } else if (part.includes('-')) {
      const [loText, hiText] = part.split('-')
      if (!/^\d+$/.test(loText) || !/^\d+$/.test(hiText)) return null
      lo = Number(loText)
      hi = Number(hiText)
      if (lo > hi) return null
    } else if (/^\d+$/.test(part)) {
      lo = Number(part)
      hi = Number(part)
    } else {
      return null
    }
    if (lo < min || hi > max) return null
    for (let value = lo; value <= hi; value += stride) values.add(value)
  }
  return values
}

interface CronFields {
  minutes: Set<number>
  hours: Set<number>
  daysOfMonth: Set<number>
  months: Set<number>
  daysOfWeek: Set<number>
  domWildcard: boolean
  dowWildcard: boolean
}

function parseCron(expression: string): CronFields | null {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [minuteField, hourField, domField, monthField, dowField] = parts
  const minutes = parseField(minuteField, 0, 59)
  const hours = parseField(hourField, 0, 23)
  const daysOfMonth = parseField(domField, 1, 31)
  const months = parseField(monthField, 1, 12)
  const daysOfWeek = parseField(dowField, 0, 7)
  if (!minutes || !hours || !daysOfMonth || !months || !daysOfWeek) return null
  if (daysOfWeek.has(7)) {
    daysOfWeek.add(0)
    daysOfWeek.delete(7)
  }
  return {
    minutes,
    hours,
    daysOfMonth,
    months,
    daysOfWeek,
    domWildcard: domField.split('/')[0] === '*',
    dowWildcard: dowField.split('/')[0] === '*',
  }
}

function nextOccurrences(fields: CronFields, count = OCCURRENCE_COUNT): Date[] {
  const result: Date[] = []
  let y = 2024
  let m = 11
  let d = 31
  const limit = y + 15
  while (result.length < count && y < limit) {
    if (fields.months.has(m + 1)) {
      const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
        for (let day = d; day <= daysInMonth; day++) {
          const dow = new Date(Date.UTC(y, m, day)).getUTCDay()
          let dayMatch: boolean
          if (fields.domWildcard && !fields.dowWildcard) {
            dayMatch = fields.daysOfWeek.has(dow)
          } else if (!fields.domWildcard && fields.dowWildcard) {
            dayMatch = fields.daysOfMonth.has(day)
          } else {
            dayMatch = fields.daysOfMonth.has(day) || fields.daysOfWeek.has(dow)
          }
          if (!dayMatch) continue
        for (let h = 0; h <= 23; h++) {
          if (!fields.hours.has(h)) continue
          for (let min = 0; min <= 59; min++) {
            if (!fields.minutes.has(min)) continue
            result.push(new Date(Date.UTC(y, m, day, h, min)))
            if (result.length === count) {
              d = day + 1
              return result
            }
          }
        }
        d = day + 1
      }
    }
    d = 1
    m += 1
    if (m === 12) {
      m = 0
      y += 1
    }
  }
  return result
}

function fmtDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function fmtTime(date: Date): string {
  return `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`
}

function fmtClock(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

function sorted(set: Set<number>): number[] {
  return [...set].sort((a, b) => a - b)
}

function isContiguous(list: number[]): boolean {
  return list.every((v, i) => i === 0 || v === list[i - 1] + 1)
}

function descriptionOf(fields: CronFields): string {
  const { minutes, hours, daysOfMonth, daysOfWeek, months } = fields
  const allDays = daysOfMonth.size === 31 && daysOfWeek.size === 7
  const monthName = () => (months.size === 12 ? null : sorted(months).map((m) => MONTHS[m - 1]).join(', '))
  const weekdayName = () => (daysOfWeek.size === 7 ? null : sorted(daysOfWeek).map((d) => WEEKDAYS[d]).join(', ', ))

  if (minutes.size === 1 && hours.size === 1) {
    const h = [...hours][0]
    const min = [...minutes][0]
    const time = fmtClock(h, min)
    if (daysOfMonth.size === 1 && months.size === 1) {
      return `At ${time} on ${MONTHS[[...months][0] - 1]} ${[...daysOfMonth][0]}`
    }
    if (daysOfWeek.size === 1) {
      return `At ${time} on ${weekdayName()}`
    }
    if (months.size === 12 && daysOfMonth.size === 1) {
      return `At ${time} on day ${[...daysOfMonth][0]} of the month`
    }
    return `At ${time} every day`
  }

  if (allDays && minutes.size === 60 && hours.size === 24) {
    return 'Every minute'
  }
  const minuteStep = stepEvery(minutes)
  if (minuteStep !== null && minuteStep > 1) {
    if (hours.size === 1) {
      return `Every ${minuteStep} minutes at ${fmtClock([...hours][0], 0)}`
    }
    const list = sorted(hours)
    const hourText = isContiguous(list)
      ? `between ${fmtClock(list[0], 0)} and ${fmtClock(list[list.length - 1], 0)}`
      : `at ${list.map((h) => fmtClock(h, 0)).join(', ')}`
    return `Every ${minuteStep} minutes ${hourText}`
  }
  const hourStep = stepEvery(hours)
  if (hourStep !== null && hourStep > 1 && minutes.size === 1) {
    const min = [...minutes][0]
    const list = sorted(hours)
    const hourText = isContiguous(list)
      ? `between ${fmtClock(list[0], 0)} and ${fmtClock(list[list.length - 1], 0)}`
      : `at ${list.map((h) => fmtClock(h, 0)).join(', ')}`
    return `Every ${hourStep} hours ${hourText} at minute ${pad2(min)}`
  }

  const when: string[] = []
  const minuteText = minutes.size === 1 ? pad2([...minutes][0]) : null
  if (minuteText !== null) when.push(`at minute ${minuteText}`)
  if (hours.size === 1) {
    const h = [...hours][0]
    when.push(h === 0 ? 'at midnight' : `at ${fmtClock(h, 0)}`)
  } else {
    const list = sorted(hours)
    when.push(isContiguous(list) ? `between ${fmtClock(list[0], 0)} and ${fmtClock(list[list.length - 1], 0)}` : `at ${list.map((h) => fmtClock(h, 0)).join(', ')}`)
  }
  const mText = monthName()
  if (mText !== null) when.push(`in ${mText}`)
  const dText = weekdayName()
  if (dText !== null) when.push(`on ${dText}`)
  return `Run${when.length > 0 ? ' ' + when.join(' ') : ' every minute'}`
}

function stepEvery(set: Set<number>): number | null {
  const list = sorted(set)
  if (list.length < 2) return null
  const step = list[1] - list[0]
  if (step < 1) return null
  return list.every((v, i) => v === list[0] + i * step) ? step : null
}

function FrequencySelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <div className="lc-field">
      <label className="lc-field-label" htmlFor="cron-frequency">
        Frequency
      </label>
      <select
        id="cron-frequency"
        className="lc-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function generateExpression(frequency: string, days: boolean[], time: string): string {
  const [hText, mText] = time.split(':')
  const h = Number(hText)
  const m = Number(mText)
  const hour = Number.isInteger(h) ? h : 0
  const minute = Number.isInteger(m) ? m : 0
  if (frequency === 'Weekly') {
    const chosen = days.map((on, i) => (on ? i : -1)).filter((i) => i >= 0)
    if (chosen.length === 0) return `${minute} ${hour} * * *`
    return `${minute} ${hour} * * ${chosen.join(',')}`
  }
  return `${minute} ${hour} * * *`
}

export function App() {
  const [tab, setTab] = useState('Expression to Text')
  const [expression, setExpression] = useState('')
  const [frequency, setFrequency] = useState('Every day')
  const [dayFlags, setDayFlags] = useState<boolean[]>([false, false, false, false, false, false, false])
  const [time, setTime] = useState('09:00')
  const [toast, setToast] = useState<string | null>(null)
  const { copy } = useClipboard()

  useEffect(() => {
    setExpression(cronStore.get().expression)
  }, [])

  useEffect(() => {
    cronStore.set({ expression })
  }, [expression])

  useEffect(() => {
    if (toast === null) return
    const id = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(id)
  }, [toast])

  const trimmed = expression.trim()
  const fields = trimmed !== '' ? parseCron(trimmed) : null
  const invalid = trimmed !== '' && fields === null
  const occurrences = fields !== null ? nextOccurrences(fields) : []
  const description = fields !== null ? descriptionOf(fields) : ''

  function copyDescription() {
    if (description === '') return
    void copy(description)
      .then(() => setToast('Description copied'))
      .catch(() => setToast('Copy failed'))
  }

  function generate() {
    setExpression(generateExpression(frequency, dayFlags, time))
    setTab('Expression to Text')
    setToast('Expression generated')
  }

  const shellStatus =
    toast !== null
      ? toast
      : invalid
        ? 'Invalid expression'
        : fields !== null && occurrences[0]
          ? `Next: ${fmtDate(occurrences[0])} ${fmtTime(occurrences[0])}`
          : undefined

  return (
    <AppShell
      name="Cron Explainer"
      icon="timesheets"
      hue="cobalt"
      category="Productivity"
      status={shellStatus}
    >
      <div className="lc-tabs" role="tablist" aria-label="Sections">
        {['Expression to Text', 'Text to Expression'].map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={'lc-tab' + (tab === item ? ' active' : '')}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Expression to Text' && (
        <Stack>
          <Card mono="5 fields" title="Cron expression">
            <FormGrid>
              <TextInput
                label="Cron expression"
                value={expression}
                onChange={setExpression}
                placeholder="0 9 * * 1"
              />
            </FormGrid>
            <Stack lg>
              <label className="lc-field-label" htmlFor="cron-description">
                Description
              </label>
              <output
                id="cron-description"
                className="lc-input"
                aria-live="polite"
                style={{ display: 'block', whiteSpace: 'pre-wrap' }}
              >
                {invalid ? 'Invalid cron expression' : description}
              </output>
              <div>
                <Button kind="primary" ariaLabel="Copy description" onClick={copyDescription}>
                  Copy description
                </Button>
              </div>
            </Stack>
          </Card>
          {fields !== null && (
            <Card mono={`${occurrences.length} shown`} title="Next occurrences">
              <Table
                label="Next occurrences"
                columns={[
                  { key: 'date', label: 'Date' },
                  { key: 'time', label: 'Time' },
                ]}
                rows={occurrences.map((date) => ({
                  cells: {
                    date: fmtDate(date) + ' ',
                    time: fmtTime(date),
                  },
                }))}
              />
            </Card>
          )}
        </Stack>
      )}

      {tab === 'Text to Expression' && (
        <Card mono="Builder" title="Build an expression">
          <FormGrid>
            <FrequencySelect
              value={frequency}
              onChange={setFrequency}
              options={['Every day', 'Weekly']}
            />
            <TextInput label="Time" type="time" value={time} onChange={setTime} />
          </FormGrid>
          {frequency === 'Weekly' && (
            <div>
              <Body sm>On these days:</Body>
              <Stack>
                {WEEKDAYS.map((day, i) => (
                  <Checkbox
                    key={day}
                    label={day}
                    checked={dayFlags[i]}
                    onChange={(checked) =>
                      setDayFlags((flags) => flags.map((f, j) => (j === i ? checked : f)))
                    }
                  />
                ))}
              </Stack>
            </div>
          )}
          <Stack>
            <Button kind="primary" onClick={generate}>
              Generate
            </Button>
            <TextInput
              label="Cron expression"
              value={expression}
              onChange={setExpression}
            />
          </Stack>
        </Card>
      )}
    </AppShell>
  )
}
