// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useState } from 'react'
import { Actions, Body, Button, Card, Checkbox, EmptyState, FormGrid, MonoLabel, Select, Stack, Table, Tag, TextInput } from '@lacuna/ui'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { saveText } from '@lacuna/file-save-open'
import {
  ADAR, MAX_YEAR, MIN_YEAR, fixedFromIso, formatHebrew, gregorianInRange, isLeapYear, isoFromFixed, monthChoices,
  monthName, toHebrew, validateHebrew, type HebrewDate,
} from './hebrew'
import { TYPE_LABEL, nextOccurrences, type AnniversaryType } from './anniversaries'
import type { Anniversary } from './host'
import { HebrewLine, longDate } from './shared'

const TYPES = Object.keys(TYPE_LABEL) as AnniversaryType[]

type Store = {
  list(): Anniversary[]
  add(r: Omit<Anniversary, 'id'>): Anniversary
  remove(id: string): boolean
}

export function AnniversariesTab({ store, today }: { store: Store; today: number }) {
  const [items, setItems] = useState<Anniversary[]>(() => store.list())
  const refresh = () => setItems(store.list())

  const [label, setLabel] = useState('')
  const [type, setType] = useState<AnniversaryType>('birthday')
  const [year, setYear] = useState('5780')
  const [month, setMonth] = useState(7)
  const [day, setDay] = useState('1')
  const [adarII, setAdarII] = useState(false)
  const [greg, setGreg] = useState('')
  const [after, setAfter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const y = Number(year)
  const yearOk = Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR
  const choices = monthChoices(yearOk ? y : 5780)
  const effMonth = choices.some((c) => c.value === month) ? month : ADAR
  const showAdarToggle = type === 'yahrzeit' && yearOk && effMonth === ADAR && !isLeapYear(y)

  function fillFromGregorian() {
    const rd = greg ? fixedFromIso(greg) : null
    if (rd === null) return setError('Pick a Gregorian date to convert.')
    if (!gregorianInRange(after ? rd + 1 : rd)) return setError('That date is outside the supported Hebrew years.')
    const h = toHebrew(rd, after)
    setYear(String(h.year))
    setMonth(h.month)
    setDay(String(h.day))
    setError(null)
  }

  function add() {
    const origin: HebrewDate = { year: y, month: effMonth, day: Number(day) }
    const v = validateHebrew(origin)
    if (!v.ok) return setError(v.reason)
    const name = label.trim() || TYPE_LABEL[type].replace(/ \(.*\)/, '')
    store.add({ label: name, type, year: origin.year, month: origin.month, day: origin.day, adarII: showAdarToggle && adarII })
    setLabel('')
    setError(null)
    refresh()
  }

  function remove(id: string) {
    store.remove(id)
    refresh()
  }

  function exportIcs() {
    const events: IcsEvent[] = []
    for (const a of items) {
      const occ = nextOccurrences(specOf(a), today, 10)
      for (const o of occ) {
        const iso = isoFromFixed(o.rd)
        const end = isoFromFixed(o.rd + 1)
        events.push({
          id: `${a.id}-${iso}@hebrew-calendar.lacuna`,
          summary: `${a.label} (${TYPE_LABEL[a.type]}${o.years ? `, ${o.years}` : ''})`,
          description: `Hebrew date ${formatHebrew(o.hebrew)}.`,
          startDate: iso,
          endDate: end,
          allDay: true,
        })
      }
    }
    saveText(toIcs(events), { filename: 'hebrew-anniversaries.ics', mimeType: 'text/calendar' })
  }

  return (
    <Stack>
      <Card mono="Saved" title={`${items.length} ${items.length === 1 ? 'anniversary' : 'anniversaries'}`}
        actions={<Actions><Button onClick={exportIcs} disabled={items.length === 0}>Export .ics</Button></Actions>}>
        {items.length === 0 && <EmptyState title="No anniversaries yet" detail="Add a Hebrew birthday, yahrzeit or mitzvah date below." />}
        <Stack>
          {items.map((a) => <AnniversaryCard key={a.id} a={a} today={today} onRemove={() => remove(a.id)} />)}
        </Stack>
      </Card>
      <Card mono="New" title="Add an anniversary">
        <Stack>
          <FormGrid>
            <TextInput label="Label" value={label} onChange={setLabel} placeholder="Sample birthday" />
            <Select label="Type" value={type} onChange={(v) => setType(v as AnniversaryType)}
              options={TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
          </FormGrid>
          <Body sm>Enter the Hebrew date of the birth{type === 'yahrzeit' ? ' or death' : ''}.</Body>
          <FormGrid>
            <TextInput label="Hebrew year" type="number" inputMode="numeric" value={year} onChange={setYear} />
            <Select label="Month" value={String(effMonth)} onChange={(v) => setMonth(Number(v))}
              options={choices.map((c) => ({ value: String(c.value), label: c.label }))} />
            <TextInput label="Day" type="number" inputMode="numeric" value={day} onChange={setDay} hint="1 to 30" />
          </FormGrid>
          {showAdarToggle && (
            <Checkbox label="Observe in Adar II in leap years (default is Adar I)" checked={adarII} onChange={setAdarII} />
          )}
          <FormGrid>
            <TextInput label="Or start from a Gregorian date" type="date" value={greg} onChange={setGreg} />
            <Checkbox label="After sunset" checked={after} onChange={setAfter} />
            <Button onClick={fillFromGregorian}>Fill Hebrew date</Button>
          </FormGrid>
          {error && <span className="lk-field-error" role="alert">{error}</span>}
          <Actions><Button kind="primary" onClick={add}>Add anniversary</Button></Actions>
        </Stack>
      </Card>
    </Stack>
  )
}

function specOf(a: Anniversary) {
  return { type: a.type, origin: { year: a.year, month: a.month, day: a.day }, adarII: a.adarII }
}

function AnniversaryCard({ a, today, onRemove }: { a: Anniversary; today: number; onRemove: () => void }) {
  const occ = nextOccurrences(specOf(a), today, 10)
  const origin = { year: a.year, month: a.month, day: a.day }
  const single = a.type === 'bar-mitzvah' || a.type === 'bat-mitzvah'
  return (
    <Card mono={TYPE_LABEL[a.type]} title={a.label}
      actions={<Actions><Button onClick={onRemove} ariaLabel={`Delete ${a.label}`}>Delete</Button></Actions>}>
      <Stack>
        <Body sm><span>{a.type === 'yahrzeit' ? 'Date of death' : 'Date of birth'}: </span><HebrewLine h={origin} /></Body>
        {a.adarII && <MonoLabel faint>Adar II in leap years</MonoLabel>}
        {occ.length === 0 && <Body sm>No later occurrence in the supported years.</Body>}
        {occ.length > 0 && (
          <div className="hc-scroll">
            <Table
              label={`Next dates for ${a.label}`}
              columns={[
                { key: 'when', label: single ? 'Date' : 'Next dates' },
                { key: 'heb', label: 'Hebrew date' },
                { key: 'n', label: single ? 'Age' : 'Years', num: true },
              ]}
              rows={occ.map((o) => ({
                cells: {
                  when: <span>{longDate(o.rd)}{single && o.rd < today ? <> <Tag>Past</Tag></> : null}</span>,
                  heb: `${o.hebrew.day} ${monthName(o.hebrew.year, o.hebrew.month)} ${o.hebrew.year}`,
                  n: o.years,
                },
              }))}
            />
          </div>
        )}
      </Stack>
    </Card>
  )
}
