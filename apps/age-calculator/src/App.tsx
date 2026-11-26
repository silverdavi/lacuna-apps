// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useMemo, useState } from 'react'
import { AppShell, Body, Button, Card, FormGrid, MonoLabel, Pills, PrimaryButton, Rail, Stack, TextInput } from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { fromISODate, toISODate } from '@lacuna/date-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { ageStore, ageHistoryStore } from './host'
import type { AgeRecord } from './host'

interface Result {
  years: number
  months: number
  days: number
  totalDays: number
  next: string | null
  error: string | null
}

function zeroResult(): Result {
  return { years: 0, months: 0, days: 0, totalDays: 0, next: null, error: null }
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

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime())
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  return d
}

function nextBirthday(birth: Date, reference: Date): string | null {
  const sameDay = birth.getDate() === reference.getDate() && birth.getMonth() === reference.getMonth()
  let target = addMonths(birth, 1)
  if (sameDay) target = addMonths(birth, 12)
  if (target.getTime() <= reference.getTime()) target = addMonths(target, 12)
  const days = Math.round((target.getTime() - reference.getTime()) / 86_400_000)
  const months = (target.getFullYear() - reference.getFullYear()) * 12 + (target.getMonth() - reference.getMonth())
  return `${months} months and ${days} days`
}

function computeAge(birth: string, reference: string): Result {
  const birthDate = fromISODate(birth)
  if (birthDate === null) return { ...zeroResult(), error: 'Enter a birth date to calculate an age.' }
  const referenceDate = reference !== '' ? fromISODate(reference) : new Date()
  if (referenceDate === null) return { ...zeroResult(), error: 'Enter a valid reference date.' }
  if (referenceDate < birthDate) return { ...zeroResult(), error: 'Reference date must be on or after birth date' }
  const d = calendarDiff(birthDate, referenceDate)
  const totalDays = Math.round((referenceDate.getTime() - birthDate.getTime()) / 86_400_000)
  const next = d.years === 0 && d.months === 0 && d.days === 0 ? null : nextBirthday(birthDate, referenceDate)
  return { years: d.years, months: d.months, days: d.days, totalDays, next, error: null }
}

export function App() {
  const store = useMemo(() => ageStore(), [])
  const historyStore = useMemo(() => ageHistoryStore(), [])
  const [birth, setBirth] = useState<string>(() => store.get().birth)
  const [reference, setReference] = useState<string>(() => store.get().reference)
  const [result, setResult] = useState<Result>(() =>
    store.get().calculated ? computeAge(store.get().birth, store.get().reference) : zeroResult(),
  )
  const [view, setView] = useState<'calc' | 'history'>('calc')
  const [history, setHistory] = useState<AgeRecord[]>(() => historyStore.list().slice(0, 8).reverse())
  const { copy, copied } = useClipboard({ timeoutMs: 1600 })

  const refreshHistory = () => setHistory(historyStore.list().slice(0, 8).reverse())

  function onCalculate(): void {
    const next = computeAge(birth, reference)
    setResult(next)
    store.set({ birth, reference, calculated: true })
    if (next.error === null && next.years !== 0 || next.error === null && next.totalDays !== 0) {
      historyStore.add({
        label: birth,
        birth,
        reference,
        result: `${next.years}y ${next.months}m ${next.days}d`,
      })
    }
    refreshHistory()
  }

  function useToday(): void {
    setReference(toISODate(new Date()))
  }

  const resultLine = `Years: ${result.years} · Months: ${result.months} · Days: ${result.days} · Total days ${result.totalDays}`

  const chartData = [
    { label: 'Y', value: result.years },
    { label: 'M', value: result.months },
    { label: 'D', value: result.days },
  ]

  const resultText = `${result.years} years, ${result.months} months, ${result.days} days`

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify(history.map(({ birth: b, reference: r, result: res }) => ({ birth: b, reference: r, result: res })), null, 2),
    },
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => ['birth,reference,result', ...history.map(({ birth: b, reference: r, result: res }) => `${b},${r},"${res}"`)].join('\n'),
    },
  ]

  return (
    <AppShell
      name="Age Calculator"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={result.error === null ? 'Result ready' : `${history.length} saved`}
      status="Stored locally"
      side={
        <Rail
          title="Age Calculator"
          note="Birth + reference"
          chips={['Y · M · D split', 'Total days', 'Next birthday', 'Local history']}
        />
      }
    >
      <Stack>
        <Pills items={['Calc', 'History']} active={view === 'calc' ? 'Calc' : 'History'} onSelect={(v) => setView(v === 'History' ? 'history' : 'calc')} />

        {view === 'calc' ? (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', marginTop: 'calc(14px * var(--sf))' }}>
                <Button kind="secondary" onClick={useToday}>Use today</Button>
                <PrimaryButton onClick={onCalculate}>Calculate</PrimaryButton>
              </div>
            </Card>

            <Card mono="Breakdown" title="Age">
              <table aria-label="Age breakdown">
                <tbody>
                  <tr>
                    <td>Total days</td>
                    <td className="lc-mono" aria-label="Age result">
                      {resultLine}
                    </td>
                  </tr>
                </tbody>
              </table>
              {result.error === null && result.next !== null && (
                <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
                  <MonoLabel sm>Next birthday</MonoLabel>
                  <Body style={{ marginTop: 'calc(6px * var(--sf))' }}>{result.next} to go.</Body>
                </div>
              )}
            </Card>

            <Card mono="Visual" title="Age breakdown">
              <Chart type="bar" data={chartData} ariaLabel="Age breakdown chart" />
            </Card>

            <Card mono="Share" title="Copy & export">
              <Body sm>Copy the result to the clipboard, or download the saved history.</Body>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', marginTop: 'calc(14px * var(--sf))', flexWrap: 'wrap' }}>
                <Button kind="secondary" onClick={() => void copy(resultText)} disabled={result.error !== null}>{copied ? 'Copied' : 'Copy result'}</Button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
                  <span>EXPORT</span>
                  <ExportMenu options={exportOptions} fileName="age-history" ariaLabel="Export" disabled={history.length === 0} />
                </div>
              </div>
            </Card>
          </Stack>
        ) : (
          <Card mono="History" title="Saved calculations">
            <Body sm>Recent results kept on this device, newest first.</Body>
            <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
              {history.length === 0 ? (
                <Body sm style={{ color: 'var(--ink-60)' }}>Nothing saved yet. Calculate an age to start a history.</Body>
              ) : (
                <div role="list" aria-label="Saved calculations">
                  {history.map((h) => (
                    <div key={h.id} role="listitem" style={{ display: 'flex', justifyContent: 'space-between', gap: 'calc(12px * var(--sf))', padding: 'calc(10px * var(--sf)) 0', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>{h.birth} → {h.reference}</span>
                      <span>{h.result}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {history.length > 0 && (
              <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
                <Button
                  kind="ghost"
                  onClick={() => {
                    historyStore.clear()
                    refreshHistory()
                  }}
                >
                  Clear history
                </Button>
              </div>
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
