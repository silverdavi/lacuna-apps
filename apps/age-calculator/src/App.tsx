// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { AppShell, Body, Card, FormGrid, PrimaryButton, Stack, TextInput } from '@lacuna/ui'
import { fromISODate } from '@lacuna/date-math'
import { Chart } from '@lacuna/chart'
import { ageStore } from './host'

interface Result {
  years: number
  months: number
  days: number
  totalDays: number
  error: string | null
}

function zeroResult(): Result {
  return { years: 0, months: 0, days: 0, totalDays: 0, error: null }
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

function calendarDiff(from: Date, to: Date): { years: number; months: number; days: number } {
  let years = to.getFullYear() - from.getFullYear()
  let months = to.getMonth() - from.getMonth()
  let days = to.getDate() - from.getDate()
  if (days < 0) {
    months -= 1
    days += daysInMonth(to.getFullYear(), to.getMonth() - 1)
  }
  while (months < 0) {
    years -= 1
    months += 12
  }
  return { years, months, days }
}

function computeAge(birth: string, reference: string): Result {
  const birthDate = fromISODate(birth)
  if (birthDate === null) return { ...zeroResult(), error: 'Enter a birth date to calculate an age.' }
  const referenceDate = reference !== '' ? fromISODate(reference) : new Date()
  if (referenceDate === null) return { ...zeroResult(), error: 'Enter a valid reference date.' }
  if (referenceDate < birthDate) return { ...zeroResult(), error: 'Reference date must be on or after birth date' }
  const d = calendarDiff(birthDate, referenceDate)
  const totalDays = Math.round((referenceDate.getTime() - birthDate.getTime()) / 86_400_000)
  return { years: d.years, months: d.months, days: d.days, totalDays, error: null }
}

export function App() {
  const store = useMemo(() => ageStore(), [])
  const [birth, setBirth] = useState<string>(() => store.get().birth)
  const [reference, setReference] = useState<string>(() => store.get().reference)
  const [result, setResult] = useState<Result>(() =>
    store.get().calculated ? computeAge(store.get().birth, store.get().reference) : zeroResult(),
  )

  function onCalculate(): void {
    const next = computeAge(birth, reference)
    setResult(next)
    store.set({ birth, reference, calculated: true })
  }

  const chartData = [
    { label: 'Y', value: result.years },
    { label: 'M', value: result.months },
    { label: 'D', value: result.days },
  ]

  return (
    <AppShell name="Age Calculator" icon="docs" hue="gold" category="Productivity">
      <Stack>
        <Card mono="Dates" title="Age Calculator">
          <Body>Enter a birth date to begin</Body>
          <FormGrid>
            <TextInput label="Birth date" type="date" value={birth} onChange={setBirth} placeholder="YYYY-MM-DD" />
            <TextInput label="Reference date" type="date" value={reference} onChange={setReference} placeholder="Leave blank for today" />
          </FormGrid>
          {result.error !== null && (
            <div className="lk-error" role="alert">
              <Body>{result.error}</Body>
            </div>
          )}
          <PrimaryButton onClick={onCalculate}>Calculate</PrimaryButton>
        </Card>

        <Card mono="Breakdown" title="Age">
          <table aria-label="Age breakdown">
            <tbody>
              <tr>
                <td>Total days</td>
                <td className="lc-mono" aria-label="Age result">
                  Years: {result.years} · Months: {result.months} · Days: {result.days} · Total days {result.totalDays}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card mono="Visual" title="Age breakdown">
          <Chart type="bar" data={chartData} ariaLabel="Age breakdown chart" />
        </Card>
      </Stack>
    </AppShell>
  )
}
