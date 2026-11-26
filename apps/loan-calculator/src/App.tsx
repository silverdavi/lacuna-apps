import { useEffect, useMemo, useState } from 'react'
import { Chart } from '@lacuna/chart'
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
  SectionLabel,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { parseCsv, toRecords } from '@lacuna/csv-parse'
import {
  calculateLoan,
  formatMoney,
  principalError,
  rateError,
  yearsError,
  type LoanResult,
  type SavedLoan,
} from './loan'
import { host } from './host'

const CHART_MAX_LABELS = 6

function buildChartData(r: LoanResult) {
  const rows = r.rows
  if (rows.length === 0) return []
  const step = Math.max(1, Math.ceil(rows.length / CHART_MAX_LABELS))
  const seen = new Set<number>()
  const picks: { idx: number; row: (typeof rows)[number] }[] = []
  for (let i = 0; i < rows.length; i += step) {
    if (!seen.has(i)) {
      seen.add(i)
      picks.push({ idx: i, row: rows[i] })
    }
  }
  const last = rows.length - 1
  if (!seen.has(last)) {
    seen.add(last)
    picks.push({ idx: last, row: rows[last] })
  }
  return picks.map((p) => ({
    label: `Pmt ${p.idx + 1}`,
    value: p.row.balance,
  }))
}

function loadDefaults() {
  const saved = host.load()
  if (saved.principal !== '' || saved.rate !== '' || saved.years !== '') {
    return { principal: saved.principal, rate: saved.rate, years: saved.years }
  }
  return { principal: '100000', rate: '5', years: '30' }
}

export function App() {
  const [defaults] = useState(loadDefaults)
  const [principal, setPrincipal] = useState(defaults.principal)
  const [rate, setRate] = useState(defaults.rate)
  const [years, setYears] = useState(defaults.years)
  const [showSchedule, setShowSchedule] = useState(false)
  const [saved, setSaved] = useState<SavedLoan[]>(() => host.listSavedLoans())
  const [savedMsg, setSavedMsg] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const pErr = principalError(principal)
  const rErr = rateError(rate)
  const yErr = yearsError(years)

  const [lastResult, setLastResult] = useState<LoanResult | null>(null)
  useEffect(() => {
    if (pErr || rErr || yErr) return
    host.save({ principal, rate, years })
    const r = calculateLoan({ principal, rate, years })
    if (r) setLastResult(r)
  }, [principal, rate, years, pErr, rErr, yErr])
  const result = lastResult

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

  function saveCurrent() {
    if (!result) return
    host.addSavedLoan({
      principal,
      rate,
      years,
      monthlyPayment: result.monthlyPayment,
      savedAt: Date.now(),
    })
    setSaved(host.listSavedLoans())
    setSavedMsg(true)
    window.setTimeout(() => setSavedMsg(false), 2000)
  }

  function removeSaved(id: string) {
    host.removeSavedLoan(id)
    setSaved(host.listSavedLoans())
  }

  function applyImported(record: Record<string, string>) {
    const p = (record['principal'] ?? '').trim()
    const r = (record['rate'] ?? '').trim()
    const y = (record['years'] ?? '').trim()
    setPrincipal(p)
    setRate(r)
    setYears(y)
    const err = principalError(p) ?? rateError(r) ?? yearsError(y)
    if (err) {
      setImportMsg({ ok: false, text: err })
      return
    }
    setImportMsg({ ok: true, text: `Loaded a loan: ${p} at ${r}% over ${y} years` })
  }

  function runImport() {
    const text = importText.trim()
    if (text === '') {
      setImportMsg({ ok: false, text: 'Paste a row like "100000,5,30" to load a loan.' })
      return
    }
    const parsed = parseCsv(text, { header: true })
    if (parsed.errors.length > 0) {
      setImportMsg({ ok: false, text: `Could not read the CSV: ${parsed.errors[0]?.message ?? 'invalid row'}` })
      return
    }
    if (parsed.header === null || parsed.rows.length === 0) {
      setImportMsg({ ok: false, text: 'No data rows to load.' })
      return
    }
    const records = toRecords(parsed)
    const record = records[0]
    if (!record) {
      setImportMsg({ ok: false, text: 'No data rows to load.' })
      return
    }
    applyImported(record)
  }

  const exportOptions: ExportOption[] = result
    ? [
        {
          id: 'csv',
          label: 'Amortization CSV',
          mimeType: 'text/csv',
          extension: 'csv',
          getData: () => scheduleCsv(result),
        },
        {
          id: 'json',
          label: 'Result JSON',
          mimeType: 'application/json',
          extension: 'json',
          getData: () => JSON.stringify(result, null, 2),
        },
      ]
    : []

  const chartData = result ? buildChartData(result) : []

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
          chips={['Amortization', 'Saved loans', 'Works offline']}
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
            error={pErr ?? undefined}
          />
          <TextInput
            label="Annual rate %"
            value={rate}
            onChange={setRate}
            inputMode="decimal"
            placeholder="5"
            error={rErr ?? undefined}
          />
          <TextInput
            label="Years"
            value={years}
            onChange={setYears}
            inputMode="decimal"
            placeholder="30"
            error={yErr ?? undefined}
          />
        </FormGrid>
        <Actions>
          <Button onClick={saveCurrent} disabled={!result}>
            Save loan
          </Button>
          <Button kind="secondary" onClick={copySummary} disabled={!result}>
            {copied ? 'Copied' : 'Copy summary'}
          </Button>
        </Actions>
        {savedMsg && <p role="status">Saved.</p>}
      </Card>

      <Card mono="Result" title="Results">
        {result ? (
          <KpiRow>
            <Kpi value={formatMoney(result.monthlyPayment)} label="Monthly payment" accent />
            <Kpi value={formatMoney(result.totalInterest)} label="Total interest" />
            <Kpi value={formatMoney(result.totalPaid)} label="Total paid" />
          </KpiRow>
        ) : (
          <SectionLabel>Enter a loan to see results</SectionLabel>
        )}
      </Card>

      {result && (
        <Card mono={`Balance · ${result.rows.length} payments`} title="Balance over time">
          <Chart
            type="line"
            data={chartData}
            title="Outstanding balance"
            ariaLabel="Loan balance over time"
            width={720}
            height={220}
          />
        </Card>
      )}

      <Card mono={`Saved · ${saved.length}`} title="Saved loans">
        {saved.length === 0 ? (
          <EmptyState title="No saved loans yet" detail="Set a principal, rate, and term, then choose Save loan." />
        ) : (
          <List label="Saved loans">
            {saved.map((loan) => (
              <Row
                key={loan.id}
                title={`${loan.principal} at ${loan.rate}%`}
                meta={`${loan.years}y`}
                value={formatMoney(loan.monthlyPayment)}
                action={
                  <Button kind="ghost" ariaLabel={`Delete ${loan.principal}`} onClick={() => removeSaved(loan.id)}>
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>

      <Card mono="Import · Export" title="Bring in a loan">
        <FormGrid>
          <TextInput
            label="Import"
            value={importText}
            onChange={setImportText}
            inputMode="text"
            placeholder="principal,rate,years"
            error={importMsg && !importMsg.ok ? importMsg.text : undefined}
          />
        </FormGrid>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button kind="secondary" onClick={runImport}>
            Load loan
          </Button>
          {result && (
            <ExportMenu
              options={exportOptions}
              fileName={`loan-${principal || 'calc'}`}
              ariaLabel="Export loan result"
            />
          )}
        </div>
        {importMsg && importMsg.ok && (
          <SectionLabel>{importMsg.text}</SectionLabel>
        )}
      </Card>

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
            <div
              style={{
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: '70vh',
              }}
            >
              <Table
                label="Amortization schedule"
                columns={[
                  { key: 'n', label: 'Pmt' },
                  { key: 'payment', label: 'Payment', num: true },
                  { key: 'interest', label: 'Interest', num: true },
                  { key: 'principal', label: 'Principal', num: true },
                  { key: 'balance', label: 'Balance', num: true },
                ]}
                rows={result.rows.map((row, i) => ({
                  cells: {
                    n: `${i + 1} `,
                    payment: formatMoney(row.payment),
                    principal: formatMoney(row.principalPart),
                    interest: formatMoney(row.interest),
                    balance: formatMoney(row.balance),
                  },
                }))}
              />
            </div>
            ) : (
            <SectionLabel>Use Show schedule to reveal the amortization table</SectionLabel>
          )}
        </Card>
      )}
    </AppShell>
  )
}

function scheduleCsv(result: LoanResult): string {
  const head = 'n,payment,interest,principal,balance'
  const rows = result.rows.map((row, i) =>
    [i + 1, row.payment.toFixed(2), row.interest.toFixed(2), row.principalPart.toFixed(2), row.balance.toFixed(2)].join(','),
  )
  return [head, ...rows].join('\n')
}
