import { useEffect, useState } from 'react'
import { Body, Button, Card, EmptyState, Kpi, KpiRow, Stack, Table, TextInput, Title } from '@lacuna/ui'
import { defaultInputs, host } from './host'
import type { MortgageInputs, MortgageResult, SavedScenario } from './host'

function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calculate(inputs: MortgageInputs): { result?: MortgageResult; error?: string } {
  const homePrice = Number(inputs.homePrice)
  const interestRate = Number(inputs.interestRate)
  const termYears = Number(inputs.termYears)
  const downPayment = Number(inputs.downPayment)
  if (!Number.isFinite(homePrice) || homePrice <= 0) {
    return { error: 'Home price must be greater than 0' }
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
  if (downPayment >= homePrice) {
    return { error: 'Down payment must be less than the home price' }
  }
  const loanAmount = homePrice - downPayment
  const n = termYears * 12
  const r = interestRate / 100 / 12
  const monthlyPayment = r === 0 ? loanAmount / n : (loanAmount * r) / (1 - (1 + r) ** -n)
  const rows: MortgageResult['rows'] = []
  let balance = loanAmount
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
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalPaid: loanAmount + totalInterest,
      years: termYears,
      rows,
    },
  }
}

export function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(defaultInputs)
  const [result, setResult] = useState<MortgageResult | null>(null)
  const [error, setError] = useState('')
  const [scenarios, setScenarios] = useState<SavedScenario[]>([])

  useEffect(() => {
    const saved = host.loadState()
    if (saved) {
      setInputs(saved.inputs)
      setScenarios(saved.scenarios)
      // Do not restore the result; only show it after the user clicks Calculate
    } else {
      const fresh = calculate(defaultInputs)
      if (fresh.result) setResult(fresh.result)
    }
  }, [])

  function set(field: keyof MortgageInputs, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  function run() {
    const { result: next, error: nextError } = calculate(inputs)
    if (nextError || !next) {
      setResult(null)
      setError(nextError ?? 'Calculation failed')
      return
    }
    setResult(next)
    setError('')
    host.saveState({ inputs, result: next, scenarios })
  }

  function saveScenario() {
    if (!result) return
    const next = [...scenarios, { inputs, result }]
    setScenarios(next)
    host.saveState({ inputs, result, scenarios: next })
  }

  return (
    <main>
      <Card mono="Shelf">
        <Stack lg>
          <Title size="lg">Mortgage Calculator</Title>
          <Body>
            Enter the home price, down payment, rate, and term to see your payment and
            a year-by-year breakdown.
          </Body>
          <Stack>
            <TextInput label="Home price" value={inputs.homePrice} onChange={(v) => set('homePrice', v)} />
            <TextInput label="Down payment" value={inputs.downPayment} onChange={(v) => set('downPayment', v)} />
            <TextInput label="Interest rate" value={inputs.interestRate} onChange={(v) => set('interestRate', v)} />
            <TextInput label="Term" value={inputs.termYears} onChange={(v) => set('termYears', v)} />
            {error && <Body sm style={{ color: 'var(--danger)' }}>{error}</Body>}
            <Stack style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              <Button kind="primary" onClick={run}>Calculate</Button>
              <Button kind="secondary" onClick={saveScenario} style={!result ? { opacity: 0.5 } : undefined}>
                Save scenario
              </Button>
            </Stack>
          </Stack>
          {result ? (
            <Stack>
              <KpiRow>
                <Kpi value={money(result.loanAmount)} label="Loan amount" accent />
                <Kpi value={money(result.monthlyPayment)} label="Monthly payment" />
                <Kpi value={money(result.totalInterest)} label="Total interest" />
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
                      principal: money(row.principalPaid),
                      interest: money(row.interestPaid),
                      balance: money(row.remainingBalance),
                    },
                  }))}
                />
              </Card>
            </Stack>
          ) : (
              <EmptyState title="No calculation yet" detail="Enter the details and press Calculate." />
          )}
          <Card mono="Scenarios" title="Saved scenarios" flush>
            {scenarios.length === 0 ? (
              <EmptyState title="No saved scenarios yet" detail="Press Save scenario to keep a snapshot of the current calculation." />
            ) : (
              <div aria-label="Saved scenarios">
                <Table
                  columns={[
                    { key: 'price', label: 'Home price', num: true },
                    { key: 'payment', label: 'Monthly', num: true },
                    { key: 'interest', label: 'Interest', num: true },
                  ]}
                  rows={scenarios.map((s) => ({
                    cells: {
                      price: money(Number(s.inputs.homePrice) || 0),
                      payment: money(s.result.monthlyPayment),
                      interest: money(s.result.totalInterest),
                    },
                  }))}
                />
              </div>
            )}
          </Card>
        </Stack>
      </Card>
    </main>
  )
}
