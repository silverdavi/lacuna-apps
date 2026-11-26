import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
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
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
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

function BandBar({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="bmi-band">
      <div className="bmi-band-track">
        <div
          className={active ? 'bmi-band-fill bmi-band-fill--on' : 'bmi-band-fill'}
          role="img"
          aria-label="BMI band"
        >
          <span className="bmi-band-label">{label}</span>
        </div>
      </div>
    </div>
  )
}

export function App() {
  const initial = host.read()
  const [units, setUnits] = useState<Units>(initial?.units ?? 'metric')
  const [height, setHeight] = useState(initial?.height ?? '')
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ bmi: number; category: Category } | null>(
    initial ? { bmi: initial.bmi, category: categoryOf(initial.bmi) } : null,
  )
  const [history, setHistory] = useState(host.history())
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  function onUnits(value: Units) {
    setUnits(value)
    setError(null)
  }

  function onCalculate() {
    const h = Number(height)
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Weight must be greater than 0')
      return
    }
    if (!Number.isFinite(h) || h <= 0) {
      setError('Height must be greater than 0')
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
    setError(null)
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
              <Select
                label="Units"
                value={units}
                onChange={(value) => onUnits(value as Units)}
                options={[
                  { value: 'metric', label: 'Metric (cm, kg)' },
                  { value: 'imperial', label: 'Imperial (ft, lbs)' },
                ]}
              />
              <TextInput
                label={heightLabel}
                value={height}
                onChange={(value) => {
                  setHeight(value)
                  setError(null)
                }}
                inputMode="decimal"
              />
              <TextInput
                label={weightLabel}
                value={weight}
                onChange={(value) => {
                  setWeight(value)
                  setError(null)
                }}
                inputMode="decimal"
              />
            </FormGrid>
          </div>
          <Actions>
            <Button kind="primary" onClick={onCalculate}>
              Calculate
            </Button>
          </Actions>
          {error && (
            <div
              role="alert"
              style={{
                marginTop: 'calc(12px * var(--sf))',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(12px * var(--tf))',
                letterSpacing: 'calc(0.3px * var(--sf))',
                color: 'var(--danger)',
              }}
            >
              {error}
            </div>
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
            <KpiRow>
              <div>
                <Kpi value={`BMI: ${result.bmi.toFixed(1)}`} label={result.category} accent />
              </div>
            </KpiRow>
          ) : (
            <EmptyState
              mono="No result yet"
              title="BMI: —"
              detail="Enter your height and weight and press Calculate."
            />
          )}
        </Card>

        <Card mono="Breakdown" title="BMI categories">
          <SectionLabel>Where you fall</SectionLabel>
          <div className="bmi-bands" style={{ margin: 'calc(8px * var(--sf)) 0 calc(14px * var(--sf))' }}>
            {CATEGORIES.map((c) => (
              <BandBar key={c.key} label={c.key} active={result?.category === c.key} />
            ))}
          </div>
          <SectionLabel>Categories</SectionLabel>
          <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
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
          </div>
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
