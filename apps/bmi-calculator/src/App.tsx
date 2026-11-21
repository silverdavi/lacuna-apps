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
  Rail,
  SectionLabel,
  Select,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { host, type Units } from './host'

type Category = 'Underweight' | 'Normal weight' | 'Overweight' | 'Obese'

const CATEGORIES: { key: Category; range: string; short: string }[] = [
  { key: 'Underweight', range: 'Below 18.5', short: 'Under' },
  { key: 'Normal weight', range: '18.5 - 24.9', short: 'Normal' },
  { key: 'Overweight', range: '25.0 - 29.9', short: 'Over' },
  { key: 'Obese', range: '30.0 and above', short: 'Obese' },
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

const gap = 'calc(12px * var(--sf))'
const gapLg = 'calc(20px * var(--sf))'

export function App() {
  const initial = host.read()
  const [units, setUnits] = useState<Units>(initial?.units ?? 'metric')
  const [height, setHeight] = useState(initial?.height ?? '')
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ bmi: number; category: Category } | null>(
    initial ? { bmi: initial.bmi, category: categoryOf(initial.bmi) } : null,
  )

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
    setError(null)
    setResult({ bmi: rounded, category })
  }

  const heightLabel = units === 'metric' ? 'Height (cm)' : 'Height (ft)'
  const weightLabel = units === 'metric' ? 'Weight (kg)' : 'Weight (lbs)'

  return (
    <AppShell
      name="BMI Calculator"
      icon="clinic"
      hue="teal"
      category="Health"
      meta={result ? `BMI ${result.bmi.toFixed(1)}` : undefined}
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
          <div style={{ marginTop: gap, marginBottom: gap }}>
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
                marginTop: gap,
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

        <Card mono="Result" title="Your BMI">
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
          <table className="lc-table" aria-label="BMI categories">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">BMI range</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const active = result?.category === c.key
                return (
                  <tr key={c.key} className={active ? 'hot' : undefined} aria-current={active ? 'true' : undefined}>
                    <td data-label="Category">{c.key}</td>
                    <td className="num" data-label="BMI range">{c.range}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>

        <Card mono="Where you fall" title="Your position in each band">
          {result ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(24px * var(--sf))',
              }}
            >
              {CATEGORIES.map((c) => {
                const active = result.category === c.key
                return (
                  <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap }}>
                    <div
                      role="meter"
                      aria-label={`${c.key} band`}
                      style={{
                        position: 'relative',
                        width: active ? '100%' : '0%',
                        minWidth: 'calc(2px * var(--sf))',
                        height: 'calc(22px * var(--sf))',
                        borderRadius: 'calc(2px * var(--sf))',
                        background: 'var(--ui-line)',
                        overflow: 'hidden',
                        flex: '0 0 auto',
                        transition: 'width calc(240ms) ease',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'var(--accent)',
                          opacity: 0.16,
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 'calc(10px * var(--sf))',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          whiteSpace: 'nowrap',
                          fontFamily: 'var(--sans)',
                          fontSize: 'calc(12px * var(--tf))',
                          color: 'var(--ink-80)',
                        }}
                      >
                        {c.key}
                      </span>
                    </div>
                    <Tag accent={active}>{active ? 'Here' : c.range}</Tag>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState mono="No result yet" title="Nothing to show" detail="Your bands will fill in after a calculation." />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
