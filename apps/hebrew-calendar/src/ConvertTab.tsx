// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useMemo, useState } from 'react'
import { Body, Card, Checkbox, Cols, FormGrid, Select, Stack, TextInput } from '@lacuna/ui'
import { DatePicker } from '@lacuna/date-picker'
import {
  ADAR, ADAR_II, MAX_YEAR, MIN_YEAR, fixedFromHebrew, fixedFromIso, gregorianInRange, isLeapYear, isoFromFixed,
  formatHebrew, formatHebrewLetters, monthChoices, toHebrew, validateHebrew, hebrewFromFixed,
} from './hebrew'
import { CopyButton, Heb, longDate } from './shared'

export function ConvertTab({ today }: { today: number }) {
  return (
    <Cols kind="2">
      <GregorianToHebrew today={today} />
      <HebrewToGregorian today={today} />
    </Cols>
  )
}

function GregorianToHebrew({ today }: { today: number }) {
  const [iso, setIso] = useState(isoFromFixed(today))
  const [after, setAfter] = useState(false)
  const rd = fixedFromIso(iso)
  const result = useMemo(() => {
    if (rd === null) return { error: 'Pick a date.' } as const
    const effective = after ? rd + 1 : rd
    if (!gregorianInRange(effective)) {
      return { error: `That date is outside Hebrew years ${MIN_YEAR} to ${MAX_YEAR}.` } as const
    }
    return { h: toHebrew(rd, after) } as const
  }, [rd, after])

  return (
    <Card mono="Gregorian to Hebrew" title="Hebrew date of a day">
      <Stack>
        <div className="hc-picker">
          <DatePicker
            value={iso}
            ariaLabel="Gregorian date"
            showClear={false}
            onChange={(v) => { if (typeof v === 'string') setIso(v) }}
          />
        </div>
        <Checkbox label="After sunset" checked={after} onChange={setAfter} />
        <div className="hc-result" role="status" aria-label="Hebrew date result">
          {'error' in result ? (
            <span className="lk-field-error" role="alert">{result.error}</span>
          ) : (
            <>
              <div className="hc-result-main">{formatHebrew(result.h)}</div>
              <Heb className="hc-result-he">{formatHebrewLetters(result.h)}</Heb>
              <Body sm>
                {longDate(rd as number)}{after ? ', after sunset (the Hebrew day has turned over)' : ''}
              </Body>
              <CopyButton text={`${longDate(rd as number)} = ${formatHebrew(result.h)}${after ? ' (after sunset)' : ''}`} />
            </>
          )}
        </div>
      </Stack>
    </Card>
  )
}

function HebrewToGregorian({ today }: { today: number }) {
  const start = hebrewFromFixed(today)
  const [year, setYear] = useState(String(start.year))
  const [month, setMonth] = useState(start.month)
  const [day, setDay] = useState(String(start.day))

  const y = Number(year)
  const yearOk = Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR
  const choices = yearOk ? monthChoices(y) : monthChoices(5787)
  // A month the year does not have (Adar II in a common year) falls back to Adar.
  const effectiveMonth = choices.some((c) => c.value === month) ? month : month === ADAR_II ? ADAR : choices[0].value
  const d = Number(day)

  const check = validateHebrew({ year: y, month: effectiveMonth, day: d })
  const rd = check.ok ? fixedFromHebrew({ year: y, month: effectiveMonth, day: d }) : null

  return (
    <Card mono="Hebrew to Gregorian" title="Gregorian date of a Hebrew date">
      <Stack>
        <FormGrid>
          <TextInput label="Hebrew year" type="number" inputMode="numeric" value={year} onChange={setYear}
            hint={yearOk ? (isLeapYear(y) ? 'Leap year, 13 months' : 'Common year, 12 months') : `${MIN_YEAR} to ${MAX_YEAR}`} />
          <Select label="Month" value={String(effectiveMonth)} onChange={(v) => setMonth(Number(v))}
            options={choices.map((c) => ({ value: String(c.value), label: c.label }))} />
          <TextInput label="Day" type="number" inputMode="numeric" value={day} onChange={setDay} hint="1 to 30" />
        </FormGrid>
        <div className="hc-result" role="status" aria-label="Gregorian date result">
          {rd === null && !check.ok ? (
            <span className="lk-field-error" role="alert">{check.reason}</span>
          ) : (
            <>
              <div className="hc-result-main">{longDate(rd as number)}</div>
              <Body sm>{formatHebrew({ year: y, month: effectiveMonth, day: d })}</Body>
              <Heb className="hc-result-he">{formatHebrewLetters({ year: y, month: effectiveMonth, day: d })}</Heb>
              <CopyButton text={`${formatHebrew({ year: y, month: effectiveMonth, day: d })} = ${longDate(rd as number)}`} />
            </>
          )}
        </div>
      </Stack>
    </Card>
  )
}
