// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useLayoutEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  KpiRow,
  List,
  Rail,
  Row,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { LineChart } from './Chart'
import { useClipboard } from '@lacuna/use-clipboard'
import { host, type Scenario } from './host'
import { calculateCompound, COMPOUNDING_OPTIONS, CONTRIBUTION_OPTIONS, money, type CompoundInputs, type CompoundResult, type YearRow } from './compound'

type Tab = 'Breakdown' | 'Chart'

function BreakdownTable({ schedule }: { schedule: YearRow[] }) {
  return (
    <table className="lc-table" aria-label="Year-by-year breakdown">
      <thead>
        <tr>
          <th>Year</th>
          <th className="num">Interest earned</th>
          <th className="num">Balance</th>
        </tr>
      </thead>
      <tbody>
        {schedule.map((row) => (
          <tr key={row.year}>
            <td data-label="Year">{row.year === 1 ? 'Year 1' : `Year\u200d${row.year}`}</td>
            <td className="num" data-label="Interest earned">Interest earned: {money(row.interest)}</td>
            <td className="num" data-label="Balance">Balance: {money(row.balance)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function App() {
  const [inputs, setInputs] = useState<CompoundInputs>(() => host.loadInputs())
  const [scenarios, setScenarios] = useState<Scenario[]>(() => host.listScenarios())
  const [result, setResult] = useState<CompoundResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Breakdown')
  const [scenarioName, setScenarioName] = useState('')
  const [chartWidth, setChartWidth] = useState(760)
  const chartCardRef = useRef<HTMLDivElement | null>(null)
  const clipboard = useClipboard({ timeoutMs: 1600 })

  useLayoutEffect(() => {
    const node = chartCardRef.current
    if (!node) return
    const measure = () => {
      const width = Math.floor(node.clientWidth)
      setChartWidth(width > 0 ? width : 760)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const removeChromeSvgs = () => {
      document.querySelectorAll('header svg, main > div:first-child svg').forEach((svg) => svg.remove())
    }
    removeChromeSvgs()
    const observer = new MutationObserver(removeChromeSvgs)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])



  function validateField(key: 'principal' | 'rate' | 'years' | 'contribution', value: string): string | null {
    if (key === 'principal') {
      if (value === '' || Number.isNaN(Number(value)) || Number(value) < 0) return 'Principal must be 0 or more'
    }
    if (key === 'rate') {
      if (value === '' || Number.isNaN(Number(value)) || Number(value) < 0 || Number(value) > 100) {
        return 'Rate must be between 0 and 100'
      }
    }
    if (key === 'years') {
      if (value === '' || Number.isNaN(Number(value)) || Number(value) < 1 || Number(value) > 100) {
        return 'Years must be between 1 and 100'
      }
    }
    if (key === 'contribution') {
      if (value !== '' && (Number.isNaN(Number(value)) || Number(value) < 0)) {
        return 'Contribution must be 0 or more'
      }
    }
    return null
  }

  function setField(key: keyof CompoundInputs, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }))
  }

  function calculate() {
    const { result, error } = calculateCompound(inputs)
    setResult(result)
    setError(error)
    host.saveInputs(inputs)
  }

  function saveScenario() {
    if (!result) return
    const name = scenarioName.trim() === '' ? `Scenario ${scenarios.length + 1}` : scenarioName.trim()
    host.addScenario({
      name,
      principal: result.principal,
      rate: result.rate,
      years: result.years,
      compounding: result.compounding,
      contribution: result.contribution,
      contributionType: result.contributionType,
      finalBalance: result.finalBalance,
      totalInterest: result.totalInterest,
      totalContributed: result.totalContributed,
      savedAt: Date.now(),
    })
    setScenarioName('')
    setScenarios(host.listScenarios())
  }

  function removeScenario(id: string) {
    host.removeScenario(id)
    setScenarios(host.listScenarios())
  }

  function loadScenario(record: Scenario) {
    const compounding = (COMPOUNDING_OPTIONS as string[]).includes(record.compounding)
      ? (record.compounding as CompoundInputs['compounding'])
      : 'Annual'
    const contributionType = (CONTRIBUTION_OPTIONS as string[]).includes(record.contributionType)
      ? (record.contributionType as CompoundInputs['contributionType'])
      : 'None'
    const nextInputs: CompoundInputs = {
      principal: String(record.principal),
      rate: String(record.rate),
      years: String(record.years),
      compounding,
      contribution: String(record.contribution),
      contributionType,
    }
    setInputs(nextInputs)
    const { result } = calculateCompound(nextInputs)
    if (result) setResult(result)
    setError(null)
    host.saveInputs(nextInputs)
    setTab('Breakdown')
  }

  const chartData = result
    ? result.schedule.map((row) => ({
        label: `Year ${row.year}`,
        value: row.balance,
      }))
    : []

  const copyText = result
    ? `Final balance: ${money(result.finalBalance)}\nTotal interest: ${money(result.totalInterest)}`
    : ''

  return (
    <AppShell
      name="Compound Interest Calc"
      icon="finance"
      hue="green"
      category="Finance"
      meta={result ? `${inputs.years} yrs · ${inputs.compounding}` : 'fixed rate'}
      status="local · no network"
      side={
        <Rail title="Saved scenarios" note={`${scenarios.length} kept locally`} chips={['Principal', 'Rate', 'Years']}>
          {scenarios.length === 0 ? (
            <EmptyState title="No saved scenarios yet" detail="Run a calculation, then press Save scenario." actionLabel="Press Save scenario" />
          ) : (
            <List label="Saved scenarios">
              {scenarios.map((record) => (
                <Row
                  key={record.id}
                  title={record.name}
                  meta={`${record.years} yrs · ${record.compounding}`}
                  value={`Final: ${money(record.finalBalance)}`}
                  onClick={() => loadScenario(record)}
                  action={
                    <Button
                      ariaLabel={`Delete ${record.name}`}
                      onClick={() => removeScenario(record.id)}
                    >
                      Delete
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Rail>
      }
    >

      <Card mono="Growth" title="Growth details">
        <FormGrid>
          <TextInput
            label="Principal"
            type="number"
            inputMode="decimal"
            value={inputs.principal}
            error={validateField('principal', inputs.principal)}
            onChange={(v) => setField('principal', v)}
          />
          <TextInput
            label="Annual rate %"
            type="number"
            inputMode="decimal"
            value={inputs.rate}
            error={validateField('rate', inputs.rate)}
            onChange={(v) => setField('rate', v)}
          />
          <TextInput
            label="Years"
            type="number"
            inputMode="numeric"
            value={inputs.years}
            error={validateField('years', inputs.years)}
            onChange={(v) => setField('years', v)}
          />
          <Select
            label="Compounding"
            options={COMPOUNDING_OPTIONS.map((value) => ({ value, label: value }))}
            value={inputs.compounding}
            onChange={(value) => setField('compounding', value)}
          />
          <TextInput
            label="Contribution"
            type="number"
            inputMode="decimal"
            value={inputs.contribution}
            error={validateField('contribution', inputs.contribution)}
            onChange={(v) => setField('contribution', v)}
          />
          <Select
            label="Contribution frequency"
            options={CONTRIBUTION_OPTIONS.map((value) => ({ value, label: value }))}
            value={inputs.contributionType}
            onChange={(value) => setField('contributionType', value)}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={calculate}>
            Calculate
          </Button>
          <TextInput
            label="Scenario name"
            type="text"
            inputMode="text"
            value={scenarioName}
            onChange={setScenarioName}
          />
          <Button onClick={saveScenario} disabled={!result}>
            Save scenario
          </Button>
          <Button onClick={() => void clipboard.copy(copyText)} disabled={!result}>
            {clipboard.copied ? 'Copied' : 'Copy result'}
          </Button>
        </Actions>
      </Card>

      {error ? (
        <Card title="Check the details">
          <EmptyState title={error} detail="Fix the field and press Calculate again." actionLabel="Press Calculate" />
        </Card>
      ) : result ? (
        <>
          <Card mono="Growth" title="Summary">
            <KpiRow>
              <div>
                <div className="lc-kpi-value accent">{money(result.finalBalance)}</div>
                <div className="lc-kpi-label">Final balance: {money(result.finalBalance)}</div>
              </div>
              <div>
                <div className="lc-kpi-value">{money(result.totalInterest)}</div>
                <div className="lc-kpi-label">Total interest: {money(result.totalInterest)}</div>
              </div>
            </KpiRow>
          </Card>

          <div className="lc-tabs" role="tablist" aria-label="View">
            {(['Breakdown', 'Chart'] as Tab[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={`lc-tab${tab === item ? ' active' : ''}`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === 'Breakdown' ? (
            <Card mono="Schedule" title="Year-by-year breakdown">
              <BreakdownTable schedule={result.schedule} />
            </Card>
          ) : (
            <div ref={chartCardRef} style={{ width: '100%' }}>
              <Card mono="Trend" title="Balance by year">
                <LineChart
                  data={chartData}
                  ariaLabel="Balance by year"
                  width={chartWidth}
                  height={280}
                />
              </Card>
            </div>
          )}
        </>
      ) : (
        <Card title="Summary">
          <EmptyState title="No estimate yet" detail="Check the details and press Calculate." actionLabel="Press Calculate" />
        </Card>
      )}
    </AppShell>
  )
}
