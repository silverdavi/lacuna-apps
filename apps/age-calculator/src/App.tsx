import { useState } from 'react'
import { Body, Button, Card, Kpi, KpiRow, Stack, Table, Tag, TextInput } from '@lacuna/ui'
import { loadAgeCalculation, saveAgeCalculation, type AgeCalculationRecord } from './host'

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  if (day < 1 || day > daysInMonth) return false
  return true
}

function parseYmd(value: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!isValidYmd(year, month, day)) return null
  return [year, month, day]
}

function todayParts(): [number, number, number] {
  const now = new Date()
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()]
}

function isLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function ageInYmd(birth: [number, number, number], reference: [number, number, number]): { years: number; months: number; days: number } {
  // A Feb 29 birthday has no anniversary in non-leap years. The day is
  // considered reached on Mar 1 of that year, so a reference date before
  // Mar 1 in a non-leap year is treated as if the 29th had already passed.
  const birthIsFeb29 = birth[1] === 2 && birth[2] === 29
  // In a non-leap year the Feb 29 anniversary lands on Mar 1, so the day is
  // measured from Feb 28 when the reference date falls in that year's March.
  const nonLeapMarch = birthIsFeb29 && !isLeap(reference[0]) && reference[1] === 3
  const effectiveDays = reference[2] - (nonLeapMarch ? 28 : birth[2])
  let years = reference[0] - birth[0]
  let months = reference[1] - birth[1]
  let days = effectiveDays
  if (days < 0) {
    months -= 1
    const prevMonth = new Date(reference[0], reference[1] - 1, 0)
    days += prevMonth.getDate()
  }
  if (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

function daysBetween(a: [number, number, number], b: [number, number, number]): number {
  const toUtc = (p: [number, number, number]) => Date.UTC(p[0], p[1] - 1, p[2])
  return Math.round((toUtc(b) - toUtc(a)) / 86400000)
}

interface Summary {
  years: number
  months: number
  days: number
  referenceDate: string
}

const ZERO: Summary = { years: 0, months: 0, days: 0, referenceDate: '' }

export function App() {
  const [birth, setBirth] = useState('')
  const [reference, setReference] = useState('')
  const [error, setError] = useState('')
  const [record, setRecord] = useState<AgeCalculationRecord | null>(() => loadAgeCalculation())
  const [summary, setSummary] = useState<Summary>(() => {
    const initial = loadAgeCalculation()
    if (!initial) return ZERO
    return { years: initial.years, months: initial.months, days: initial.days, referenceDate: initial.referenceDate }
  })

  const calculate = () => {
    const birthParts = parseYmd(birth)
    const referenceParts = parseYmd(reference)
    const useToday = reference.trim() === '' || referenceParts === null
    const resolved = referenceParts ?? todayParts()
    if (!birthParts) {
      setError('Enter a valid birth date in YYYY-MM-DD format')
      setSummary(ZERO)
      setRecord(null)
      return
    }
    const resolvedKey = resolved[0] * 10000 + resolved[1] * 100 + resolved[2]
    const birthKey = birthParts[0] * 10000 + birthParts[1] * 100 + birthParts[2]
    if (resolvedKey < birthKey) {
      setError('Reference date must be on or after birth date')
      setSummary(ZERO)
      setRecord(null)
      return
    }
    setError('')
    const age = ageInYmd(birthParts, resolved)
    const referenceIso = useToday
      ? `${resolved[0]}-${String(resolved[1]).padStart(2, '0')}-${String(resolved[2]).padStart(2, '0')}`
      : reference.trim()
    const totalDays = daysBetween(birthParts, resolved)
    const next: AgeCalculationRecord = {
      birthDate: birth.trim(),
      referenceDate: referenceIso,
      years: age.years,
      months: age.months,
      days: age.days,
      totalDays,
      weeks: Math.floor(totalDays / 7),
      monthsFlattened: age.years * 12 + age.months,
      hours: totalDays * 24,
      savedAt: new Date().toISOString(),
    }
    setSummary({ years: age.years, months: age.months, days: age.days, referenceDate: referenceIso })
    setRecord(next)
    saveAgeCalculation(next)
  }

  const maxUnit = Math.max(summary.years, summary.months, summary.days, 1)

  const chartRows: { key: string; label: string; value: number }[] = [
    { key: 'years', label: 'Years', value: summary.years },
    { key: 'months', label: 'Months', value: summary.months },
    { key: 'days', label: 'Days', value: summary.days },
  ]

  return (
    <main style={{ maxWidth: 'calc(760px * var(--sf))', margin: '0 auto', padding: 'calc(16px * var(--sf))' }}>
      <Stack lg>
        <header>
          <h1 className="lc-title lc-title-lg">Age Calculator</h1>
          <Body sm>
            {summary.referenceDate
              ? `Age from ${record?.birthDate} to ${summary.referenceDate}.`
              : 'Enter a birth date to begin'}
          </Body>
        </header>
        <Card mono="Input">
          <Stack>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(12px * var(--sf))' }}>
              <TextInput label="Birth date" value={birth} onChange={setBirth} />
              <TextInput label="Reference date" value={reference} onChange={setReference} />
            </div>
            {error && <Tag accent>{error}</Tag>}
            <Button kind="primary" onClick={calculate}>
              Calculate
            </Button>
          </Stack>
        </Card>
        <Card mono="Result" title="Age" accent>
          <KpiRow>
            <Kpi value={`Years: ${summary.years}`} label="Years" accent />
            <Kpi value={`Months: ${summary.months}`} label="Months" />
            <Kpi value={`Days: ${summary.days}`} label="Days" />
          </KpiRow>
        </Card>
        {record && (
          <>
            <Card mono="Breakdown" title="Totals">
              <Table
                columns={[
                  { key: 'label', label: 'Unit' },
                  { key: 'value', label: 'Value', num: true },
                ]}
                rows={[
                  { cells: { label: 'Total days', value: record.totalDays } },
                  { cells: { label: 'Total weeks', value: record.weeks } },
                  { cells: { label: 'Total months', value: record.monthsFlattened } },
                  { cells: { label: 'Total hours', value: record.hours } },
                ]}
              />
            </Card>
            <Card mono="Chart">
              <Stack>
                {chartRows.map((row) => (
                  <div
                    key={row.key}
                    role="img"
                    aria-label={`${row.label} ${row.value}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'calc(60px * var(--sf)) 1fr calc(44px * var(--sf))',
                      alignItems: 'center',
                      gap: 'calc(8px * var(--sf))',
                    }}
                  >
                    <span style={{ fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-80)' }}>{row.label}</span>
                    <div style={{ position: 'relative', background: 'var(--ui-line)', borderRadius: 2 }}>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: `${Math.round((row.value / maxUnit) * 100)}%`,
                          background: row.key === 'years' ? 'var(--accent)' : 'var(--ink-40)',
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 'calc(11px * var(--tf))', color: 'var(--ink)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </Stack>
            </Card>
          </>
        )}
      </Stack>
    </main>
  )
}
