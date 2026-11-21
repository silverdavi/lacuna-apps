import { useEffect, useMemo, useState } from 'react'
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
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { parseCsv, toRecords } from '@lacuna/csv-parse'
import {
  calculateLoan,
  formatMoney,
  principalError,
  rateError,
  yearsError,
  type LoanResult,
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

export function App() {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [years, setYears] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const saved = host.load()
    if (saved.principal !== '' || saved.rate !== '' || saved.years !== '') {
      setPrincipal(saved.principal)
      setRate(saved.rate)
      setYears(saved.years)
    } else {
      setPrincipal('100000')
      setRate('5')
      setYears('30')
    }
    setLoaded(true)
  }, [])

  const pErr = principalError(principal)
  const rErr = rateError(rate)
  const yErr = yearsError(years)

  const result = useMemo(() => {
    if (pErr || rErr || yErr) return null
    return calculateLoan({ principal, rate, years })
  }, [principal, rate, years, pErr, rErr, yErr])

  useEffect(() => {
    if (loaded && result) host.save({ principal, rate, years })
  }, [loaded, result, principal, rate, years])

  const displayed = result
  const showEmpty = !displayed && !loaded

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

  const chartData = displayed ? buildChartData(displayed) : []

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
          <Button kind="secondary" onClick={copySummary} disabled={!result}>
            {copied ? 'Copied' : 'Copy summary'}
          </Button>
        </Actions>
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

      <Card mono="Result" title="Results">
        {showEmpty ? (
          <SectionLabel>Enter a loan to see results</SectionLabel>
        ) : (
          <KpiRow>
            <div>
              <textarea
                aria-label="Monthly payment"
                readOnly
                rows={1}
                value={displayed ? formatMoney(displayed.monthlyPayment) : ''}
                className="lc-kpi-value accent"
                style={{ resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', lineHeight: 'inherit' }}
              />
              <div className="lc-kpi-label">Monthly payment</div>
            </div>
            <div>
              <textarea
                aria-label="Total interest"
                readOnly
                rows={1}
                value={displayed ? formatMoney(displayed.totalInterest) : ''}
                className="lc-kpi-value"
                style={{ resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', lineHeight: 'inherit' }}
              />
              <div className="lc-kpi-label">Total interest</div>
            </div>
            <div>
              <textarea
                aria-label="Total paid"
                readOnly
                rows={1}
                value={displayed ? formatMoney(displayed.totalPaid) : ''}
                className="lc-kpi-value"
                style={{ resize: 'none', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'inherit', lineHeight: 'inherit' }}
              />
              <div className="lc-kpi-label">Total paid</div>
            </div>
          </KpiRow>
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

function scheduleCsv(result: LoanResult): string {
  const head = 'n,payment,interest,principal,balance'
  const rows = result.rows.map((row, i) =>
    [i + 1, row.payment.toFixed(2), row.interest.toFixed(2), row.principalPart.toFixed(2), row.balance.toFixed(2)].join(','),
  )
  return [head, ...rows].join('\n')
}
