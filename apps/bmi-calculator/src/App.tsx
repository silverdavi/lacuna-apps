import { useCallback, useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  KpiRow,
  SectionLabel,
  Table,
} from '@lacuna/ui'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useLocalRecord } from '@lacuna/use-local-record'
import { MeasureField, MeasureSelect, UNIT_OPTIONS } from './fields'
import './app.css'

type Unit = 'metric' | 'imperial'

type FieldErrors = {
  height: string | null
  weight: string | null
}

type Calculation = {
  id: string
  unit: Unit
  heightValue: number
  weightValue: number
  heightM: number
  weightKg: number
  bmi: number
  category: string
  createdAt: string
}

type LastState = {
  unit: Unit
  height: string
  weight: string
  result: Calculation | null
}

const LAST_KEY = 'bmi.last'
const HISTORY_KEY = 'bmi.history'
const MAX_HISTORY = 30

const DEFAULT_LAST: LastState = {
  unit: 'metric',
  height: '',
  weight: '',
  result: null,
}

const BANDS = [
  { label: 'Underweight', min: 0, max: 18.5, range: 'below 18.5' },
  { label: 'Normal weight', min: 18.5, max: 25, range: '18.5 – 25.0' },
  { label: 'Overweight', min: 25, max: 30, range: '25.0 – 30.0' },
  { label: 'Obese', min: 30, max: 50, range: '30.0 and above' },
] as const

function isUnit(v: unknown): v is Unit {
  return v === 'metric' || v === 'imperial'
}

function isCalculation(v: unknown): v is Calculation {
  const r = v as Calculation
  return (
    typeof r === 'object' &&
    r !== null &&
    typeof r.id === 'string' &&
    isUnit(r.unit) &&
    typeof r.bmi === 'number' &&
    Number.isFinite(r.bmi) &&
    typeof r.heightM === 'number' &&
    typeof r.weightKg === 'number' &&
    typeof r.category === 'string' &&
    typeof r.createdAt === 'string'
  )
}

function isLastState(v: unknown): v is LastState {
  const r = v as LastState
  return (
    typeof r === 'object' &&
    r !== null &&
    isUnit(r.unit) &&
    typeof r.height === 'string' &&
    typeof r.weight === 'string' &&
    (r.result === null || isCalculation(r.result))
  )
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `bmi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function categoryOf(bmi: number): string {
  for (const band of BANDS) {
    if (bmi >= band.min && bmi < band.max) return band.label
  }
  return 'Obese'
}

function bandIndex(bmi: number): number {
  for (let i = 0; i < BANDS.length; i += 1) {
    const band = BANDS[i]
    if (band && bmi >= band.min && bmi < band.max) return i
  }
  return BANDS.length - 1
}

export function App() {
  const { value: last, set: setLast } = useLocalRecord<LastState>({
    key: LAST_KEY,
    version: 1,
    defaultValue: DEFAULT_LAST,
    migrations: {
      0: (old) => {
        const o = old as Partial<LastState> | null
        const result = o?.result
        return {
          unit: isUnit(o?.unit) ? o.unit : 'metric',
          height: typeof o?.height === 'string' ? o.height : '',
          weight: typeof o?.weight === 'string' ? o.weight : '',
          result: result !== undefined && isCalculation(result) ? result : null,
        }
      },
    },
  })

  const { value: history, set: setHistory } = useLocalRecord<Calculation[]>({
    key: HISTORY_KEY,
    version: 1,
    defaultValue: [],
    migrations: {
      0: (old) => {
        const arr = Array.isArray(old) ? old : []
        return arr.filter(isCalculation).slice(0, MAX_HISTORY)
      },
    },
  })

  const units = last.unit
  const height = last.height
  const weight = last.weight
  const result = last.result

  const errors = useMemo<FieldErrors>(() => {
    const out: FieldErrors = { height: null, weight: null }
    const h = height.trim()
    const w = weight.trim()
    if (h === '' || Number.isNaN(Number(h)) || Number(h) <= 0) {
      out.height = 'Enter a height greater than 0'
    }
    if (w === '' || Number.isNaN(Number(w)) || Number(w) <= 0) {
      out.weight = 'Weight must be greater than 0'
    }
    return out
  }, [height, weight])

  const activeIndex = result ? bandIndex(result.bmi) : -1

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const points: ChartDataPoint[] = []
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const h = history[i]
      if (h) points.push({ label: formatDate(h.createdAt), value: h.bmi })
    }
    if (result) points.push({ label: 'now', value: result.bmi })
    return points
  }, [history, result])

  const exportOptions = useMemo<ExportOption[]>(
    () => [
      {
        id: 'json',
        label: 'JSON',
        mimeType: 'application/json',
        extension: 'json',
        getData: () => JSON.stringify({ generated: new Date().toISOString(), last: result, history }, null, 2),
      },
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () =>
          [
            'date,unit,height,weight,bmi,category',
            ...history.map((h) => `${h.createdAt},${h.unit},${h.heightValue},${h.weightValue},${h.bmi},${h.category}`),
          ].join('\n'),
      },
    ],
    [result, history],
  )

  const setField = useCallback(
    (field: 'height' | 'weight', value: string) => {
      setLast((prev) => ({ ...prev, [field]: value }))
    },
    [setLast],
  )

  const setUnits = useCallback(
    (value: string) => {
      setLast((prev) => ({ ...prev, unit: value as Unit }))
    },
    [setLast],
  )

  const handleCalculate = useCallback(() => {
    if (errors.height || errors.weight) return
    const hNum = Number(height)
    const wNum = Number(weight)
    let rawBmi: number
    let heightM: number
    let weightKg: number
    if (units === 'metric') {
      heightM = hNum / 100
      weightKg = wNum
      rawBmi = wNum / (heightM * heightM)
    } else {
      heightM = hNum * 0.3048
      weightKg = wNum * 0.45359237
      rawBmi = (54.5 * wNum) / (hNum * hNum)
    }
    const bmi = Math.round(rawBmi * 10) / 10
    const record: Calculation = {
      id: makeId(),
      unit: units,
      heightValue: hNum,
      weightValue: wNum,
      heightM,
      weightKg,
      bmi,
      category: categoryOf(bmi),
      createdAt: new Date().toISOString(),
    }
    setLast({ unit: units, height, weight, result: record })
    setHistory((prev) => [record, ...prev].slice(0, MAX_HISTORY))
  }, [errors, height, weight, units, setLast, setHistory])

  const handleCopy = useCallback(() => {
    if (!result || typeof navigator === 'undefined' || !navigator.clipboard) return
    const text = `BMI ${result.bmi} (${result.category}) · height ${result.heightValue} ${result.unit === 'metric' ? 'cm' : 'in'}, weight ${result.weightValue} ${result.unit === 'metric' ? 'kg' : 'lb'} · ${formatDate(result.createdAt)}`
    navigator.clipboard.writeText(text).catch(() => undefined)
  }, [result])

  const handleClearAll = useCallback(() => {
    setLast(DEFAULT_LAST)
    setHistory([])
  }, [setLast, setHistory])

  const loadEntry = useCallback(
    (h: Calculation) => {
      setLast({
        unit: h.unit,
        height: String(h.heightValue),
        weight: String(h.weightValue),
        result: { ...h },
      })
    },
    [setLast],
  )

  const hasContent = Boolean(result) || history.length > 0

  return (
    <AppShell
      name="BMI Calculator"
      icon="clinic"
      hue="teal"
      category="Health"
      meta={result ? `BMI ${result.bmi}` : hasContent ? `${history.length} saved` : undefined}
      status={result ? `Saved locally · ${result.category}` : 'Local · no network'}
      actions={
        hasContent ? (
          <Actions>
            <Button kind="ghost" onClick={handleCopy} disabled={!result} ariaLabel="Copy result">
              Copy result
            </Button>
            <ExportMenu options={exportOptions} fileName="bmi-calculator" ariaLabel="Export" />
          </Actions>
        ) : undefined
      }
    >
      <p className="lc-body">Enter your height and weight to calculate BMI</p>
      <KpiRow>
        <div>
          <div className="lc-kpi-value">{result ? `BMI: ${result.bmi}` : 'BMI: —'}</div>
          <div className="lc-kpi-label">{result ? result.category : 'No result yet'}</div>
        </div>
      </KpiRow>

      <Card mono="Input" title="Your measurements">
        <FormGrid>
          <MeasureField
            label="Height"
            value={height}
            onChange={(v) => setField('height', v)}
            hint={units === 'metric' ? 'Centimetres, e.g. 170' : 'Feet, e.g. 5'}
            placeholder={units === 'metric' ? '170' : '5'}
            error={errors.height}
          />
          <MeasureField
            label="Weight"
            value={weight}
            onChange={(v) => setField('weight', v)}
            hint={units === 'metric' ? 'Kilograms, e.g. 65' : 'Pounds, e.g. 143'}
            placeholder={units === 'metric' ? '65' : '143'}
            error={errors.weight}
          />
          <MeasureSelect value={units} onChange={setUnits} options={UNIT_OPTIONS} />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={handleCalculate}>
            Calculate
          </Button>
          {hasContent ? (
            <Button kind="ghost" onClick={handleClearAll}>
              Clear all
            </Button>
          ) : null}
        </Actions>
      </Card>

      {result ? (
        <Card mono="Breakdown" title="Where you fall">
          <Table
            label="BMI categories"
            columns={[
              { key: 'label', label: 'Category' },
              { key: 'range', label: 'BMI range', num: true },
            ]}
            rows={BANDS.map((band, i) => ({
              cells: { label: band.label, range: band.range },
              hot: i === activeIndex,
            }))}
          />
          <div className="bmi-bands">
            {BANDS.map((band, i) => (
              <span
                key={band.label}
                role="meter"
                aria-label={band.label}
                aria-valuemin={0}
                aria-valuemax={100}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...{ 'aria-valuenow': i === activeIndex ? '100%' : '0%' } as any}
                className={`bmi-band${i === activeIndex ? ' bmi-band--on' : ''}`}
              >
                <span className="bmi-band-label">{band.label}</span>
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      {chartData.length > 1 ? (
        <Card mono="Trend" title="BMI over time">
          <Chart type="line" data={chartData} title="BMI over time" ariaLabel="BMI over time" width={560} height={200} />
        </Card>
      ) : null}

      <Card mono={`History · ${history.length} of ${MAX_HISTORY}`} title="Your calculations">
        {history.length ? (
          <Table
            label="Calculation history"
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'units', label: 'Units' },
              { key: 'height', label: 'Height', num: true },
              { key: 'weight', label: 'Weight', num: true },
              { key: 'bmi', label: 'BMI', num: true },
              { key: 'category', label: 'Category' },
              { key: 'actions', label: '' },
            ]}
            rows={history.map((h) => ({
              cells: {
                date: formatDate(h.createdAt),
                units: h.unit === 'metric' ? 'Metric' : 'Imperial',
                height: `${h.heightValue} ${h.unit === 'metric' ? 'cm' : 'in'}`,
                weight: `${h.weightValue} ${h.unit === 'metric' ? 'kg' : 'lb'}`,
                bmi: h.bmi,
                category: h.category,
                actions: (
                  <Actions>
                    <Button kind="ghost" onClick={() => loadEntry(h)}>
                      Load
                    </Button>
                    <Button
                      kind="ghost"
                      ariaLabel={`Delete entry ${formatDate(h.createdAt)}`}
                      onClick={() => setHistory((prev) => prev.filter((x) => x.id !== h.id))}
                    >
                      Delete
                    </Button>
                  </Actions>
                ),
              },
            }))}
          />
        ) : (
          <EmptyState mono="Empty" title="No history yet" detail="Calculate a BMI and it will show up here, newest first." />
        )}
      </Card>

      <Card mono="Guide" title="About BMI">
        <p className="lc-body-sm">
          Body mass index (BMI) is a screening value: weight in kilograms divided by height in meters,
          squared. It is not a diagnosis — it does not account for muscle mass, age, or body
          composition — but it is a quick, standard way to compare weight against the population.
        </p>
        <SectionLabel>Worked example</SectionLabel>
        <p className="lc-body-sm">
          A person 170 cm tall and weighing 65 kg has a BMI of 65 ÷ 1.70² = 65 ÷ 2.89 = 22.5, which
          falls in the normal weight band (18.5–25).
        </p>
        <SectionLabel>Unit note</SectionLabel>
        <p className="lc-body-sm">
          The classic formula assumes metric units. When you enter imperial values (inches and pounds)
          they are converted first: 1 inch = 2.54 cm and 1 lb = 0.45359237 kg.
        </p>
      </Card>
    </AppShell>
  )
}
