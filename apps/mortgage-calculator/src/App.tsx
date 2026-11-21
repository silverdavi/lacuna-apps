// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import React, { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Select,
  Table,
  Tabs,
  TextInput,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Scenario } from './host'
import { calculateMortgage, money, moneyHidden, type MortgageResult } from './mortgage'

type View = 'Estimate' | 'Compare'

const TERM_OPTIONS = ['5', '10', '15', '20', '25', '30', '35', '40']

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '0.79em',
    fontWeight: active ? 700 : 600,
    color: active ? 'var(--ink)' : 'var(--ink-60)',
    padding: '0 0.125em 0.69em',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    borderBottom: active ? '0.125em solid var(--accent)' : '0.125em solid transparent',
    fontFamily: 'var(--sans)',
  }
}

function fmtSigned(value: number): string {
  const formatted = money(Math.abs(value))
  return value < 0 ? `−${formatted}` : `+${formatted}`
}

export function App() {
  const [inputs, setInputs] = useState<{
    homePrice: string
    downPayment: string
    rate: string
    term: string
  }>({ homePrice: '300000', downPayment: '60000', rate: '6.5', term: '30' })
  const [scenarios, setScenarios] = useState<Scenario[]>(() => host.listScenarios())
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('Estimate')
  const [rateScale, setRateScale] = useState(true)
  const [termCompare, setTermCompare] = useState('15')
  const clipboard = useClipboard({ timeoutMs: 1600 })

  const { result } = calculateMortgage(inputs)

  function setField(key: 'homePrice' | 'downPayment' | 'rate' | 'term', value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  function calculate() {
    setError(calculateMortgage(inputs).error)
  }

  function saveScenario() {
    if (!result) return
    host.addScenario({
      name: `Loan ${money(result.loanAmount)} · ${inputs.term} yrs · ${inputs.rate}%`,
      homePrice: Number(inputs.homePrice),
      downPayment: Number(inputs.downPayment),
      rate: Number(inputs.rate),
      term: Number(inputs.term),
      payment: result.monthlyPayment,
      savedAt: Date.now(),
    })
    setScenarios(host.listScenarios())
  }

  function removeScenario(id: string) {
    host.removeScenario(id)
    setScenarios(host.listScenarios())
  }

  function loadScenario(record: Scenario) {
    setInputs({
      homePrice: String(record.homePrice),
      downPayment: String(record.downPayment),
      rate: String(record.rate),
      term: String(record.term),
    })
    setError(null)
    setView('Estimate')
  }

    const alt =
    result && termCompare !== inputs.term ? compareTerm(result, inputs, Number(termCompare)) : null

  const exportOptions: ExportOption[] = result
    ? [
        {
          id: 'csv',
          label: 'Year-by-year CSV',
          mimeType: 'text/csv',
          extension: 'csv',
          getData: () => scheduleCsv(result.years),
        },
        {
          id: 'json',
          label: 'Summary JSON',
          mimeType: 'application/json',
          extension: 'json',
          getData: () => JSON.stringify({ ...result, years: undefined }, null, 2),
        },
      ]
    : []

  const chartData: ChartDataPoint[] = result
    ? result.years.map((row) => ({
        label: `Y${row.year}`,
        value: rateScale ? row.interest / 1000 : row.interest,
      }))
    : []
  const chartTitle = rateScale ? 'Interest paid each year, in thousands of dollars' : 'Interest paid each year'

  const compareRows = scenarios.map((record) => ({
    cells: {
      name: record.name,
      home: money(record.homePrice),
      down: money(record.downPayment),
      rate: `${record.rate}%`,
      term: `${record.term} yrs`,
      payment: money(record.payment),
    },
  }))

  const compareActions = (id: string, record: Scenario) => (
    <Button ariaLabel={`Load ${record.name} into the form`} onClick={() => loadScenario(record)}>
      Load
    </Button>
  )

  return (
    <AppShell
      name="Mortgage calculator"
      icon="finance"
      hue="green"
      category="Finance"
      meta={result ? `payoff in ${inputs.term} years` : 'fixed rate'}
      status={result ? 'estimate ready' : 'local · no network'}
      side={
        <Rail title="Saved scenarios" note={`${scenarios.length} kept locally`} chips={['Loan', 'Payment', 'Term']}>
          {scenarios.length === 0 ? (
            <EmptyState title="No saved scenarios yet" detail="Run a calculation, then press Save scenario." />
          ) : (
            <List label="Saved scenarios">
              {scenarios.map((record) => (
                <Row
                  key={record.id}
                  title={`Loan ${money(record.homePrice)} home`}
                  meta={`${record.term} yrs`}
                   value={money(record.payment)}
                  onClick={() => loadScenario(record)}
                  action={
                    <span
                      onMouseDown={(event) => event.stopPropagation()}
                      style={{ display: 'inline-flex', gap: 4 }}
                    >
                      <Button ariaLabel={`Load ${record.name} into the form`} onClick={() => loadScenario(record)}>
                        Load
                      </Button>
                      <Button ariaLabel={`Delete ${record.name}`} onClick={() => removeScenario(record.id)}>
                        Delete
                      </Button>
                    </span>
                  }
                />
              ))}
            </List>
          )}
        </Rail>
      }
    >
      <Card mono="Loan" title="Loan details">
        <FormGrid>
          <TextInput
            label="Home price"
            type="number"
            inputMode="decimal"
            value={inputs.homePrice}
            onChange={(v) => setField('homePrice', v)}
          />
          <TextInput
            label="Down payment"
            type="number"
            inputMode="decimal"
            value={inputs.downPayment}
            onChange={(v) => setField('downPayment', v)}
          />
          <TextInput
            label="Interest rate"
            type="number"
            inputMode="decimal"
            value={inputs.rate}
            onChange={(v) => setField('rate', v)}
          />
          <TextInput
            label="Term"
            type="number"
            inputMode="numeric"
            value={inputs.term}
            onChange={(v) => setField('term', v)}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={calculate}>
            Calculate
          </Button>
          <Button onClick={saveScenario} disabled={!result}>
            Save scenario
          </Button>
          <Button onClick={() => void clipboard.copy(summaryText(result))} disabled={!result}>
            {clipboard.copied ? 'Copied' : 'Copy summary'}
          </Button>
        </Actions>
      </Card>

      <div style={{ display: 'flex', gap: 0 }}>
        <button type="button" style={tabStyle(view === 'Estimate')} onClick={() => setView('Estimate')}>Estimate</button>
        <button type="button" style={tabStyle(view === 'Compare')} onClick={() => setView('Compare')}>Compare</button>
      </div>

      {error ? (
        <Card title="Check the loan details">
          <EmptyState title={error} detail="Fix the field and press Calculate again." />
        </Card>
      ) : view === 'Estimate' ? (
        result ? (
          <>
            <Card mono="Payoff" title="Summary">
              <KpiRow>
                <Kpi label="Loan amount" value={money(result.loanAmount)} />
                <Kpi label="Monthly payment" value={money(result.monthlyPayment)} />
                <Kpi label="Total interest" value={money(result.totalInterest)} />
                <Kpi label="Total paid" value={money(result.totalPaid)} />
              </KpiRow>
            </Card>

            <Card
              mono="Schedule"
              title="Year-by-year payoff"
              actions={
                <Button kind="ghost" onClick={() => setRateScale((s) => !s)}>
                  {rateScale ? 'Show dollars' : 'Show thousands'}
                </Button>
              }
            >
              <Table
                label="Year-by-year payoff"
                columns={[
                  { key: 'year', label: 'Year' },
                  { key: 'principal', label: 'Principal', num: true },
                  { key: 'interest', label: 'Interest', num: true },
                  { key: 'balance', label: 'Balance', num: true },
                ]}
                rows={result.years.map((row) => ({
                  cells: {
                    year: row.year,
                    principal: money(row.principal),
                    interest: money(row.interest),
                    balance: money(row.balance),
                  },
                }))}
              />
            </Card>

            <Card mono="Trend" title="Interest by year">
              <Chart type="line" data={chartData} title={chartTitle} ariaLabel={chartTitle} height={240} />
            </Card>

            <Card mono="Export" title="Share this estimate">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <ExportMenu
                  options={exportOptions}
                  fileName={`mortgage-${inputs.homePrice}`}
                  ariaLabel="Export estimate"
                />
              </div>
            </Card>
          </>
        ) : (
          <Card title="Summary">
            <EmptyState title="No estimate yet" detail="Check the loan details and press Calculate." />
          </Card>
        )
      ) : (
        <Card
          mono="Compare"
          title="Saved scenarios"
          actions={
            <Button kind="ghost" onClick={() => setView('Estimate')}>
              Back to estimate
            </Button>
          }
        >
          {scenarios.length === 0 ? (
            <EmptyState
              title="Nothing to compare yet"
              detail="Save a scenario from the estimate, then compare it against the others here."
            />
          ) : (
            <Table
              label="Saved scenarios"
              columns={[
                { key: 'name', label: 'Scenario' },
                { key: 'home', label: 'Home price', num: true },
                { key: 'down', label: 'Down', num: true },
                { key: 'rate', label: 'Rate', num: true },
                { key: 'term', label: 'Term', num: true },
                { key: 'payment', label: 'Payment', num: true },
              ]}
              rows={compareRows}
            />
          )}
        </Card>
      )}

      {result && (
        <Card mono="What-if" title="Shorter or longer loan">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
            <Select
              label="Alternate years"
              options={TERM_OPTIONS.map((value) => ({ value, label: `${value} years` }))}
              value={termCompare}
              onChange={setTermCompare}
            />
          </div>
          {alt ? (
            <List label="What-if results">
              <Row
                title="Payment difference"
                meta="what-if minus current, per month"
                value={fmtSigned(alt.payment - result.monthlyPayment)}
              />
              <Row
                title="Interest difference"
                meta="what-if minus current, over the life of the loan"
                value={fmtSigned(alt.totalInterest - result.totalInterest)}
              />
            </List>
          ) : (
            <EmptyState
              title="Pick an alternate number of years"
              detail="Choose a value other than the one in the loan details."
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}

function summaryText(result: MortgageResult | null): string {
  if (!result) return ''
  return [
    `Loan amount: ${money(result.loanAmount)}`,
    `Monthly payment: ${money(result.monthlyPayment)}`,
    `Total interest: ${money(result.totalInterest)}`,
    `Total paid: ${money(result.totalPaid)}`,
  ].join('\n')
}

function scheduleCsv(years: { year: number; principal: number; interest: number; balance: number }[]): string {
  const head = 'year,principal,interest,balance'
  const rows = years.map((r) => [r.year, r.principal.toFixed(2), r.interest.toFixed(2), r.balance.toFixed(2)].join(','))
  return [head, ...rows].join('\n')
}

function compareTerm(
  result: MortgageResult,
  inputs: { rate: string },
  termYears: number,
): { payment: number; totalInterest: number } | null {
  if (termYears <= 0 || termYears > 50 || !Number.isInteger(termYears)) return null
  const loan = result.loanAmount
  const r = Number(inputs.rate) / 100 / 12
  const n = termYears * 12
  const payment = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  const total = payment * n
  if (!Number.isFinite(payment) || !Number.isFinite(total)) return null
  return { payment, totalInterest: total - loan }
}
