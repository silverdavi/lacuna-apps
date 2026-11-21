import { useState } from 'react'
import { Body, Button, Card, Stack, TextInput } from '@lacuna/ui'
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
  const feet = height
  const lbs = weight
  return (54.5 * lbs) / (feet * feet)
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
    <main style={{ display: 'block', width: '100%', padding: 'calc(20px * var(--sf))' }}>
      <Card mono="HEALTH" title="BMI Calculator" accent>
        <Stack lg>
          <div>
            <h1
              style={{
                margin: 0,
                font: '600 calc(22px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
                letterSpacing: 'calc(-0.01em * var(--tf))',
              }}
            >
              BMI Calculator
            </h1>
            <Body>Enter your height and weight to calculate BMI</Body>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(12px * var(--sf))',
              alignItems: 'flex-end',
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(4px * var(--sf))',
                font: '500 calc(12px * var(--tf)) var(--sans)',
                color: 'var(--ink-60)',
              }}
            >
              Units
              <select
                value={units}
                onChange={(event) => onUnits(event.target.value as Units)}
                style={{
                  font: '400 calc(13px * var(--tf)) var(--sans)',
                  color: 'var(--ink)',
                  background: 'var(--ui-bright)',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(6px * var(--sf))',
                  padding: 'calc(8px * var(--sf))',
                }}
              >
                <option value="metric">Metric (cm, kg)</option>
                <option value="imperial">Imperial (ft, lbs)</option>
              </select>
            </label>
            <TextInput
              label={heightLabel}
              value={height}
              onChange={(value) => {
                setHeight(value)
                setError(null)
              }}
            />
            <TextInput
              label={weightLabel}
              value={weight}
              onChange={(value) => {
                setWeight(value)
                setError(null)
              }}
            />
            <Button kind="primary" onClick={onCalculate}>
              Calculate
            </Button>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--danger)',
                font: '500 calc(12px * var(--tf)) var(--mono)',
                letterSpacing: 'calc(0.3px * var(--sf))',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 'calc(12px * var(--sf))',
              padding: 'calc(16px * var(--sf))',
              border: 'calc(1px * var(--sf)) solid var(--ui-line)',
              borderRadius: 'calc(6px * var(--sf))',
              background: 'var(--paper-deep)',
            }}
          >
            <span
              style={{
                font: '700 calc(28px * var(--tf)) var(--mono)',
                color: result ? 'var(--ink)' : 'var(--ink-60)',
              }}
            >
              BMI: {result ? result.bmi.toFixed(1) : '—'}
            </span>
            {result && (
              <span
                style={{
                  font: '600 calc(15px * var(--tf)) var(--sans)',
                  color: 'var(--accent)',
                }}
              >
                {result.category}
              </span>
            )}
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                font: '600 calc(14px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
              }}
            >
              BMI categories
            </h2>
            <table
              style={{
                width: '100%',
                marginTop: 'calc(8px * var(--sf))',
                borderCollapse: 'collapse',
                font: '400 calc(13px * var(--tf)) var(--sans)',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'calc(8px * var(--sf))',
                      borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                      color: 'var(--ink-60)',
                      font: '500 calc(11px * var(--tf)) var(--mono)',
                      letterSpacing: 'calc(0.4px * var(--sf))',
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: 'calc(8px * var(--sf))',
                      borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                      color: 'var(--ink-60)',
                      font: '500 calc(11px * var(--tf)) var(--mono)',
                      letterSpacing: 'calc(0.4px * var(--sf))',
                    }}
                  >
                    BMI range
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => {
                  const active = result !== null && result.category === c.key
                  return (
                    <tr
                      key={c.key}
                      aria-current={active ? 'true' : undefined}
                      style={{
                        background: active ? 'var(--accent-soft, var(--ui-bright))' : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                          color: 'var(--ink)',
                          fontWeight: active ? 700 : 400,
                        }}
                      >
                        {c.key}
                      </td>
                      <td
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                          color: 'var(--ink-60)',
                        }}
                      >
                        {c.range}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                font: '600 calc(14px * var(--tf)) var(--sans)',
                color: 'var(--ink)',
              }}
            >
              Where you fall
            </h2>
            <div
              style={{
                marginTop: 'calc(10px * var(--sf))',
                display: 'flex',
                flexDirection: 'column',
                gap: 'calc(26px * var(--sf))',
              }}
            >
              {CATEGORIES.map((c) => {
                const active = result !== null && result.category === c.key
                return (
                  <div
                    key={c.key}
                    style={{
                      position: 'relative',
                      height: 'calc(10px * var(--sf))',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'var(--ui-line)',
                        borderRadius: 'calc(5px * var(--sf))',
                        overflow: 'hidden',
                      }}
                    />
                    <div
                      role="img"
                      aria-label={`${c.short} band`}
                      style={{
                        position: 'relative',
                        width: active ? '100%' : '0.1%',
                        height: 'calc(10px * var(--sf))',
                        background: 'var(--accent)',
                        borderRadius: 'calc(5px * var(--sf))',
                        overflow: 'visible',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 'calc(14px * var(--sf))',
                          font: '400 calc(12px * var(--tf)) var(--sans)',
                          color: 'var(--ink-60)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.key}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Stack>
      </Card>
    </main>
  )
}
