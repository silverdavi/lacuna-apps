// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Cols,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  calculateRetirement,
  DEFAULT_INPUTS,
  money,
  type RetirementInputs,
  type RetirementResult,
} from './retirement'
import { addPlan, listPlans, type SavedPlan } from './plans'
import { RetirementChart } from './retirement-chart'

type Tab = 'Chart' | 'Table'

const VIEWS: Tab[] = ['Chart', 'Table']

export function App() {
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULT_INPUTS)
  const [result, setResult] = useState<RetirementResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Table')
  const [plans, setPlans] = useState<SavedPlan[]>(() => listPlans())

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  function set(field: keyof RetirementInputs, value: string) {
    setInputs((prev) => ({ ...prev, [field]: value }))
  }

  function calculate() {
    const { result: next, error: nextError } = calculateRetirement(inputs)
    setResult(next)
    setError(nextError)
  }

  function savePlan() {
    if (!result) return
    addPlan({
      title: `Plan ${plans.length + 1}`,
      ages: `Age ${result.currentAge} to ${result.retirementAge}`,
      returnPct: `Return ${result.annualReturn}%`,
      projected: result.projected,
    })
    setPlans(listPlans())
  }

  async function copyResult() {
    if (!result) return
    await copy(`Projected savings at retirement: ${money(result.projected)}`)
  }

  const summary = result ? `Projected savings at retirement: ${money(result.projected)}` : null

  return (
    <AppShell
      name="Retirement Calculator"
      icon="finance"
      hue="gold"
      category="Personal"
      meta={plans.length ? `${plans.length} ${plans.length === 1 ? 'plan' : 'plans'}` : 'Local plans'}
      status="Saved on this device"
      side={
        <Rail
          title="Retirement Calculator"
          note="One plan · local"
          chips={['Calculate', 'Save', 'Works offline']}
        />
      }
    >
      <Card mono="Inputs" title="Retirement Calculator">
        <p className="lc-body">Enter your details to estimate your retirement savings.</p>
        <FormGrid>
          <TextInput
            label="Current age"
            value={inputs.currentAge}
            onChange={(v) => set('currentAge', v)}
            inputMode="numeric"
          />
          <TextInput
            label="Retirement age"
            value={inputs.retirementAge}
            onChange={(v) => set('retirementAge', v)}
            inputMode="numeric"
          />
          <TextInput
            label="Current savings"
            value={inputs.currentSavings}
            onChange={(v) => set('currentSavings', v)}
            inputMode="numeric"
          />
          <TextInput
            label="Monthly contribution"
            value={inputs.monthlyContribution}
            onChange={(v) => set('monthlyContribution', v)}
            inputMode="numeric"
          />
          <TextInput
            label="Annual return %"
            value={inputs.annualReturn}
            onChange={(v) => set('annualReturn', v)}
            inputMode="numeric"
          />
        </FormGrid>
        {error ? (
          <p className="lc-body" role="alert">
            {error}
          </p>
        ) : null}
        <Actions>
          <Button kind="primary" onClick={calculate}>Calculate</Button>
          <Button kind="ghost" onClick={savePlan} disabled={!result}>
            Save plan
          </Button>
          <Button kind="ghost" onClick={() => void copyResult()} disabled={!result}>
            Copy result
          </Button>
        </Actions>
        {copied ? (
          <p className="lc-body" role="status">
            Copied to clipboard
          </p>
        ) : null}
      </Card>

      <Card mono={summary ?? 'Result'} title="Growth by year">
        {result ? (
          <>
            <KpiRow>
              <Kpi value={String(result.years)} label={`Years, from ${result.currentAge} to ${result.retirementAge}`} />
              <Kpi value={money(result.totalContributions)} label="Contributed, including starting savings" />
              <Kpi value={money(result.totalGrowth)} label="Growth from compound interest" />
            </KpiRow>
            <div
              role="tablist"
              aria-label="View"
              style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}
            >
              {VIEWS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={tab === v}
                  onClick={() => setTab(v)}
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(13px * var(--tf))',
                    color: tab === v ? 'var(--paper)' : 'var(--ink)',
                    background: tab === v ? 'var(--ink)' : 'transparent',
                    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                    borderRadius: 'calc(7px * var(--sf))',
                    padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                    cursor: 'pointer',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            {tab === 'Chart' ? (
              <RetirementChart rows={result.rows} />
            ) : (
              <Table
                label="Yearly breakdown"
                columns={[
                  { key: 'year', label: 'Year' },
                  { key: 'contribution', label: 'Contribution', num: true },
                  { key: 'growth', label: 'Growth', num: true },
                  { key: 'balance', label: 'Balance', num: true },
                ]}
                 rows={result.rows.map((row) => ({
                   cells: {
                     year: row.year === 1 ? 'Year 1' : String(row.year),
                     contribution: money(row.contribution),
                     growth: money(row.growth),
                     balance: money(row.balance),
                   },
                 }))}
              />
            )}
          </>
        ) : (
          <EmptyState
            mono="Ready"
            title="No calculation yet"
            detail="Enter your details, then run the calculation."
            actionLabel="Start"
            onAction={() => {
              const input = document.querySelector('input.lc-input')
              if (input instanceof HTMLInputElement) input.focus()
            }}
          />
        )}
      </Card>

      <Card mono={`${plans.length} saved`} title="Saved plans">
        {plans.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No plans saved"
            detail="Calculate a plan, then save it to compare scenarios."
            actionLabel="Open inputs"
            onAction={() => {
              const input = document.querySelector('input.lc-input')
              if (input instanceof HTMLInputElement) input.focus()
            }}
          />
        ) : (
          <List label="Saved plans">
            {plans.map((plan) => (
              <Row
                key={plan.id}
                title={plan.title}
                meta={`${plan.ages} · ${plan.returnPct}`}
                value={money(plan.projected)}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
