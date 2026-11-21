import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  List,
  Rail,
  Row,
  Stack,
  Table,
} from '@lacuna/ui'
import { MeasureField, MeasureSelect } from './fields'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu } from '@lacuna/export-menu'
import { host, type Units } from './host'

type Category = 'Underweight' | 'Normal weight' | 'Overweight' | 'Obese'

const CATEGORIES: { key: Category; range: string }[] = [
  { key: 'Underweight', range: 'Below 18.5' },
  { key: 'Normal weight', range: '18.5 - 24.9' },
  { key: 'Overweight', range: '25.0 - 29.9' },
  { key: 'Obese', range: '30.0 and above' },
]

function categoryOf(bmi: number): Category {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal weight'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}

const PLIM = {
  cm: [50, 272] as const,
  kg: [2, 635] as const,
  ft: [50 / 30.48, 272 / 30.48] as const,
  lbs: [2 / 0.45359237, 635 / 0.45359237] as const,
} as const

function plausibilityError(units: Units, height: number, weight: number): string | null {
  const [hMin, hMax] = units === 'metric' ? PLIM.cm : PLIM.ft
  const [wMin, wMax] = units === 'metric' ? PLIM.kg : PLIM.lbs
  if (height < hMin || height > hMax) {
    const fmt = (n: number) => (units === 'metric' ? String(n) : String(Math.round(n * 100) / 100))
    return `Height must be between ${fmt(hMin)} and ${fmt(hMax)} ${units === 'metric' ? 'cm' : 'ft'}`
  }
  if (weight < wMin || weight > wMax) {
    const fmt = (n: number) => (units === 'metric' ? String(n) : String(Math.round(n * 100) / 100))
    return `Weight must be between ${fmt(wMin)} and ${fmt(wMax)} ${units === 'metric' ? 'kg' : 'lbs'}`
  }
  return null
}

function calculate(units: Units, heightText: string, weightText: string): number | null {
  const height = Number(heightText)
  const weight = Number(weightText)
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0) return null
  if (units === 'metric') {
    const m = height / 100
    return weight / (m * m)
  }
  return (54.5 * weight) / (height * height)
}

function resultText(bmi: number, category: Category, units: Units, height: string, weight: string): string {
  const [h, w] = units === 'metric' ? ['cm', 'kg'] : ['ft', 'lbs']
  return `BMI: ${bmi.toFixed(1)} - ${category} (height ${height} ${h}, weight ${weight} ${w})`
}

export function App() {
  const initial = host.read()
  const [units, setUnits] = useState<Units>(initial?.units ?? 'metric')
  const [height, setHeight] = useState(initial?.height ?? '')
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [error, setError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [result, setResult] = useState<{ bmi: number; category: Category } | null>(
    initial ? { bmi: initial.bmi, category: categoryOf(initial.bmi) } : null,
  )
  const [history, setHistory] = useState(host.history())
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  function onUnits(value: Units) {
    setUnits(value)
    setError(null)
    setHeightError(null)
    setWeightError(null)
  }

  function onCalculate() {
    const h = Number(height)
    const w = Number(weight)
    setError(null)
    setHeightError(null)
    setWeightError(null)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Weight must be greater than 0')
      return
    }
    if (!Number.isFinite(h) || h <= 0) {
      setError('Height must be greater than 0')
      return
    }
    const rangeError = plausibilityError(units, h, w)
    if (rangeError) {
      const which = rangeError.startsWith('Height') ? setHeightError : setWeightError
      which(rangeError)
      return
    }
    const bmi = calculate(units, height, weight)
    if (bmi === null) {
      setError('Enter a valid height and weight')
      return
    }
    const rounded = Math.round(bmi * 10) / 10
    const category = categoryOf(rounded)
    host.saveLast(units, height, weight, rounded)
    setHistory(host.history())
    setResult({ bmi: rounded, category })
  }

  function removeRecord(at: number) {
    setHistory(host.remove(at))
  }

  function copyResult() {
    if (result) void copy(resultText(result.bmi, result.category, units, height, weight))
  }

  const heightLabel = units === 'metric' ? 'Height (cm)' : 'Height (ft)'
  const weightLabel = units === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'

  const exportJson = () =>
    JSON.stringify(
      {
        last: result
          ? { units, height, weight, bmi: result.bmi, category: result.category }
          : null,
        history: history.map((r) => ({ units: r.units, height: r.height, weight: r.weight, bmi: r.bmi, category: categoryOf(r.bmi) })),
      },
      null,
      2,
    )

  return (
    <AppShell
      name="BMI Calculator"
      icon="clinic"
      hue="teal"
      category="Health"
      meta={result ? `BMI ${result.bmi.toFixed(1)}` : undefined}
      status="Saved in your space"
      side={
        <Rail
          title="BMI Calculator"
          note="Last calculation kept in your space"
          chips={units === 'metric' ? ['cm', 'kg'] : ['ft', 'lbs']}
        />
      }
    >
      <Stack lg>
        <Card mono="Input" title="Your measurements">
          <Body>Enter your height and weight to calculate BMI</Body>
          <div style={{ marginTop: 'calc(12px * var(--sf))', marginBottom: 'calc(12px * var(--sf))' }}>
            <FormGrid>
              <MeasureSelect
                label="Units"
                value={units}
                onChange={(value) => onUnits(value as Units)}
                options={[
                  { value: 'metric', label: 'Metric (cm, kg)' },
                  { value: 'imperial', label: 'Imperial (ft, lbs)' },
                ]}
              />
              <MeasureField
                label={heightLabel}
                value={height}
                onChange={(value) => {
                  setHeight(value)
                  setError(null)
                  setHeightError(null)
                }}
                error={heightError}
              />
              <MeasureField
                label={weightLabel}
                value={weight}
                onChange={(value) => {
                  setWeight(value)
                  setError(null)
                  setWeightError(null)
                }}
                error={weightError}
              />
            </FormGrid>
          </div>
          <Actions>
            <Button kind="primary" onClick={onCalculate}>
              Calculate
            </Button>
          </Actions>
          {error && (
            <ErrorState mono="Invalid input" title={error} style={{ marginTop: 'calc(12px * var(--sf))' }} />
          )}
        </Card>

        <Card
          mono="Result"
          title="Your BMI"
          actions={
            result ? (
              <Actions>
                <Button kind="ghost" onClick={copyResult}>
                  {copied ? 'Copied' : 'Copy result'}
                </Button>
                <ExportMenu
                  ariaLabel="Export BMI"
                  fileName="bmi-calculator"
                  options={[
                    {
                      id: 'json',
                      label: 'JSON',
                      mimeType: 'application/json',
                      extension: 'json',
                      getData: exportJson,
                    },
                  ]}
                />
              </Actions>
            ) : undefined
          }
        >
          {result ? (
            <Kpi value={`BMI: ${result.bmi.toFixed(1)}`} label={result.category} accent />
          ) : (
            <EmptyState
              mono="No result yet"
              title="BMI: —"
              detail="Enter your height and weight and press Calculate."
            />
          )}
        </Card>

        <Card mono="Breakdown" title="Categories">
          <Table
            label="BMI categories"
            columns={[
              { key: 'category', label: 'Category' },
              { key: 'range', label: 'BMI range', num: true },
            ]}
            rows={CATEGORIES.map((c) => ({
              cells: { category: c.key, range: c.range },
              hot: result?.category === c.key,
            }))}
          />
          {result && (
            <div className="bmi-bands" aria-hidden="true">
              {CATEGORIES.map((c) => (
                <div
                  key={c.key}
                  role="img"
                  aria-label={`${c.key} band`}
                  aria-hidden={result.category === c.key ? undefined : 'true'}
                  className={result.category === c.key ? 'bmi-band bmi-band--on' : 'bmi-band'}
                >
                  <span className="bmi-band-label">{c.key}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card mono={`${history.length} kept`} title="Your last calculations">
          {history.length === 0 ? (
            <EmptyState
              mono="No history yet"
              title="Nothing saved yet"
              detail="Each calculation is kept here so you can compare them."
            />
          ) : (
            <List label="History">
              {history.map((r) => (
                <Row
                  key={r.at}
                  title={`BMI ${r.bmi.toFixed(1)} · ${categoryOf(r.bmi)}`}
                  meta={`${r.height} ${r.units === 'metric' ? 'cm' : 'ft'} · ${r.weight} ${r.units === 'metric' ? 'kg' : 'lbs'}`}
                  value={new Date(r.at).toLocaleDateString()}
                  action={
                    <Button kind="ghost" ariaLabel={`Remove ${r.bmi.toFixed(1)}`} onClick={() => removeRecord(r.at)}>
                      Remove
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
