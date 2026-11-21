import { useEffect, useState } from 'react'
import { Chart } from '@lacuna/chart'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  KpiRow,
  Rail,
  SectionLabel,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { calculateLoan, formatMoney, loanError, type LoanInput } from './loan'
import { host } from './host'

export function App() {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [years, setYears] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)

  useEffect(() => {
    const saved = host.load()
    setPrincipal(saved.principal)
    setRate(saved.rate)
    setYears(saved.years)
  }, [])

  const input: LoanInput = { principal, rate, years }
  const error = loanError(input)
  const result = error ? null : calculateLoan(input)

  useEffect(() => {
    if (!error && result) host.save({ principal, rate, years })
  }, [error, result, principal, rate, years])

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  function copySummary() {
    if (!result) return
    const lines = [
      `Principal: ${formatMoney(Number.parseFloat(principal))}`,
      `Annual rate: ${rate}%`,
      `Term: ${years} years`,
      `Monthly payment: ${formatMoney(result.monthlyPayment)}`,
      `Total interest: ${formatMoney(result.totalInterest)}`,
      `Total paid: ${formatMoney(result.totalPaid)}`,
    ]
    void copy(lines.join('\n'))
  }

  const stride = Math.max(1, Math.floor((result?.rows.length ?? 0) / 12))
  const balanceData = result
    ? result.rows
        .filter((_, i) => i % stride === 0 || i === result.rows.length - 1)
        .map((row, idx) => ({
          label: `Pmt ${(idx * stride) + 1}`,
          value: row.balance,
        }))
    : []

  return (
    <AppShell
      name="Loan Calculator"
      icon="finance"
      hue="green"
      category="Personal"
      meta={result ? `${result.rows.length} payments` : undefined}
      status="Local · no network"
      side={
        <Rail
          title="Loan Calculator"
          note="Fixed rate · local"
          chips={['Monthly payment', 'Total interest', 'Amortization', 'Works offline']}
        />
      }
    >
      <Card mono="Loan" title="Loan details">
        <FormGrid>
          <TextInput
            label="Principal"
            value={principal}
            onChange={setPrincipal}
            inputMode="decimal"
            placeholder="100000"
            error={error}
          />
          <TextInput
            label="Annual rate %"
            value={rate}
            onChange={setRate}
            inputMode="decimal"
            placeholder="5"
          />
          <TextInput
            label="Years"
            value={years}
            onChange={setYears}
            inputMode="decimal"
            placeholder="30"
          />
        </FormGrid>
        <Actions>
          <Button kind="secondary" onClick={copySummary} disabled={!result}>
            {copied ? 'Copied' : 'Copy summary'}
          </Button>
        </Actions>
      </Card>

      <Card mono="Result" title="Results">
        <KpiRow>
          <label aria-label="Monthly payment" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lc-kpi-value accent">{result ? formatMoney(result.monthlyPayment) : ''}</span>
            <input value={result ? formatMoney(result.monthlyPayment) : ''} readOnly />
          </label>
          <label aria-label="Total interest" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lc-kpi-value">{result ? formatMoney(result.totalInterest) : ''}</span>
            <input value={result ? formatMoney(result.totalInterest) : ''} readOnly />
          </label>
          <label aria-label="Total paid" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="lc-kpi-value">{result ? formatMoney(result.totalPaid) : ''}</span>
            <input value={result ? formatMoney(result.totalPaid) : ''} readOnly />
          </label>
        </KpiRow>
      </Card>

      {result && (
        <Card mono={`Balance · ${result.rows.length} payments`} title="Balance over time">
          <Chart
            type="line"
            data={balanceData}
            title="Outstanding balance"
            ariaLabel="Loan balance over time"
            width={560}
            height={200}
          />
        </Card>
      )}

      {result && (
        <Card
          mono={`Amortization · ${result.rows.length} payments`}
          title="Schedule"
          actions={
            <Button kind="secondary" onClick={() => setShowSchedule((s) => !s)}>
              {showSchedule ? 'Hide schedule' : 'Show schedule'}
            </Button>
          }
        >
          {showSchedule ? (
            <Table
              label="Amortization schedule"
              columns={[
                { key: 'n', label: '#' },
                { key: 'payment', label: 'Payment', num: true },
                { key: 'interest', label: 'Interest', num: true },
                { key: 'principal', label: 'Principal', num: true },
                { key: 'balance', label: 'Balance', num: true },
              ]}
              rows={result.rows.map((row, i) => ({
                cells: {
                  n: i + 1,
                  payment: formatMoney(row.payment),
                  principal: formatMoney(row.principalPart),
                  interest: formatMoney(row.interest),
                  balance: formatMoney(row.balance),
                },
              }))}
            />
          ) : (
            <SectionLabel>Use Show schedule to reveal the amortization table</SectionLabel>
          )}
        </Card>
      )}
    </AppShell>
  )
}
