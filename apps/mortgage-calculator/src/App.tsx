import { useEffect, useState } from 'react'
import { Body, Button, Card, EmptyState, Kpi, KpiRow, Stack, Table, TextInput, Title } from '@lacuna/ui'
import { defaultInputs, host } from './host'
import type { MortgageInputs, MortgageResult } from './host'

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calculate(inputs: MortgageInputs): { result?: MortgageResult; error?: string } {
  const loanAmount = Number(inputs.loanAmount)
  const interestRate = Number(inputs.interestRate)
  const termYears = Number(inputs.termYears)
  const downPayment = Number(inputs.downPayment)
  if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
    return { error: 'Loan amount must be greater than 0' }
  }
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    return { error: 'Interest rate must be 0 or greater' }
  }
  if (!Number.isFinite(termYears) || termYears <= 0 || !Number.isInteger(termYears)) {
    return { error: 'Term must be a whole number of years' }
  }
  if (!Number.isFinite(downPayment) || downPayment < 0) {
    return { error: 'Down payment must be 0 or greater' }
  }
  if (downPayment >= loanAmount) {
    return { error: 'Down payment must be less than the loan amount' }
  }
  const financed = loanAmount - downPayment
  const n = termYears * 12
  const r = interestRate / 100 / 12
  const monthlyPayment = r === 0 ? financed / n : (financed * r) / (1 - (1 + r) ** -n)
  const rows: MortgageResult['rows'] = []
  let balance = financed
  for (let year = 1; year <= termYears; year++) {
    let yearPrincipal = 0
    let yearInterest = 0
    for (let month = 0; month < 12; month++) {
      const interest = balance * r
      let principal = monthlyPayment - interest
      if (principal > balance) principal = balance
      balance -= principal
      yearPrincipal += principal
      yearInterest += interest
      if (balance <= 0) break
    }
    rows.push({ year, principalPaid: yearPrincipal, interestPaid: yearInterest, remainingBalance: balance })
  }
  const totalInterest = rows.reduce((sum, row) => sum + row.interestPaid, 0)
  return {
    result: {
      loanAmount: financed,
      monthlyPayment,
      totalInterest,
      totalPaid: financed + totalInterest,
      years: termYears,
      rows,
    },
  }
}

interface Point {
  x: number
  y: number
  label: string
  value: number
}

function Chart({ result }: { result: MortgageResult }) {
  const width = 560
  const height = 220
  const padLeft = 8
  const padRight = 8
  const padTop = 12
  const padBottom = 24
  const innerW = width - padLeft - padRight
  const innerH = height - padTop - padBottom
  const maxValue = Math.max(...result.rows.map((row) => row.interestPaid), 1)
  const step = result.rows.length > 1 ? innerW / (result.rows.length - 1) : 0
  const points: Point[] = result.rows.map((row, i) => ({
    x: padLeft + (result.rows.length > 1 ? i * step : innerW / 2),
    y: padTop + innerH - (row.interestPaid / maxValue) * innerH,
    label: `Year ${row.year}`,
    value: Math.round(row.interestPaid),
  }))
  const first = points[0]
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Annual interest paid per year, first year ${money(result.rows[0]?.interestPaid ?? 0)}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="var(--accent)" />
          <text
            x={p.x}
            y={height - 8}
            textAnchor="middle"
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(8px * var(--tf))',
              fill: 'var(--mute)',
            }}
          >
            {i === 0 || result.rows.length <= 6 || i === result.rows.length - 1 || i % 5 === 0 ? p.label : ''}
          </text>
          {first && p === first && (
            <text
              x={p.x}
              y={p.y - 6}
              textAnchor="middle"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'calc(9px * var(--tf))',
                fill: 'var(--accent)',
              }}
            >
              {money(p.value)}
            </text>
          )}
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
    </svg>
  )
}

export function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(defaultInputs)
  const [result, setResult] = useState<MortgageResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = host.loadState()
    if (saved) {
      setInputs(saved.inputs)
      setResult(saved.result)
    }
  }, [])

  function set(field: keyof MortgageInputs, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  function run() {
    const { result: next, error: nextError } = calculate(inputs)
    if (nextError) {
      setResult(null)
      setError(nextError)
      return
    }
    setResult(next)
    setError('')
    host.saveState({ inputs, result: next })
  }

  return (
    <main>
      <Card mono="Shelf">
        <Stack lg>
          <Title size="lg">Mortgage Calculator</Title>
          <Body>
            Enter the loan details and press Calculate to see the monthly payment, the total interest, and a
            year-by-year breakdown of principal and interest.
          </Body>
          <Stack>
            <TextInput label="Loan amount" value={inputs.loanAmount} onChange={(v) => set('loanAmount', v)} />
            <TextInput label="Interest rate" value={inputs.interestRate} onChange={(v) => set('interestRate', v)} />
            <TextInput label="Term" value={inputs.termYears} onChange={(v) => set('termYears', v)} />
            <TextInput label="Down payment" value={inputs.downPayment} onChange={(v) => set('downPayment', v)} />
            {error && <Body sm style={{ color: 'var(--danger)' }}>{error}</Body>}
            <Button kind="primary" onClick={run}>Calculate</Button>
          </Stack>
          {result ? (
            <Stack>
              <KpiRow>
                <Kpi accent value={`Monthly payment: ${money(result.monthlyPayment)}`} label="per month" />
                <Kpi value={`Total interest: ${money(result.totalInterest)}`} label={`over ${result.years} years`} />
                <Kpi value={`Loan amount: ${money(result.loanAmount)}`} label="financed balance" />
              </KpiRow>
              <Card mono="Breakdown" title="Year by year" flush>
                <Table
                  columns={[
                    { key: 'year', label: 'Year' },
                    { key: 'principal', label: 'Principal paid', num: true },
                    { key: 'interest', label: 'Interest paid', num: true },
                    { key: 'balance', label: 'Remaining balance', num: true },
                  ]}
                  rows={result.rows.map((row) => ({
                    cells: {
                      year: `Year ${row.year}`,
                      principal: `Principal paid: ${money(row.principalPaid)}`,
                      interest: `Interest paid: ${money(row.interestPaid)}`,
                      balance: `Remaining balance: ${money(row.remainingBalance)}`,
                    },
                  }))}
                />
              </Card>
              <Card mono="Interest share" title="Annual interest paid">
                <Chart result={result} />
              </Card>
            </Stack>
          ) : (
            <EmptyState title="No calculation yet" detail="Enter the loan details and press Calculate." />
          )}
        </Stack>
      </Card>
    </main>
  )
}
