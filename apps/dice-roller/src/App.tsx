import { Component, useEffect, useState, type ReactNode } from 'react'
import { Body, Button, Card, Kpi, KpiRow, Stack, Table, TextInput } from '@lacuna/ui'
import {
  rollDice,
  saveLastRoll,
  loadLastRoll,
  type RollResult,
} from './host'

function parseSeed(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function termsFromRecord(record: NonNullable<ReturnType<typeof loadLastRoll>>) {
  const terms: { label: string; value: number }[] = []
  const totalDieCount = record.dice.reduce((sum, d) => sum + d.count, 0)
  const expand = record.dice.length === 1 && record.modifiers.length === 0 && totalDieCount > 1
  for (const die of record.dice) {
    if (expand) {
      for (const value of die.values) {
        terms.push({ label: `d${die.sides}`, value })
      }
    } else {
      const sum = die.values.reduce((a, b) => a + b, 0)
      const label = die.count === 1 ? `1d${die.sides}` : `${die.count}d${die.sides}`
      terms.push({ label, value: sum })
    }
  }
  for (const modifier of record.modifiers) {
    terms.push({ label: String(modifier), value: modifier })
  }
  return terms
}

function Shell() {
  return (
    <main>
      <Card mono="Rolls">
        <Stack>
          <h1>Dice Roller</h1>
          <Body>Enter a dice expression</Body>
          <KpiRow>
            <Kpi value="No rolls yet" label="Result" />
          </KpiRow>
        </Stack>
      </Card>
    </main>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return <Shell />
    return this.props.children
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <DiceRoller />
    </ErrorBoundary>
  )
}

function DiceRoller() {
  const [expression, setExpression] = useState('')
  const [seed, setSeed] = useState('')
  const [crypto, setCrypto] = useState(false)
  const [cryptoSeed, setCryptoSeed] = useState('')
  const [result, setResult] = useState<RollResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    const record = loadLastRoll()
    if (record) {
      setResult({ total: record.total, terms: termsFromRecord(record), record })
    }
    setRestored(true)
  }, [])

  useEffect(() => {
    if (restored && result) saveLastRoll(result.record)
  }, [restored, result])

  function handleRoll() {
    setError(null)
    try {
      const rolled = rollDice({
        expression,
        seed: parseSeed(seed),
        crypto,
        cryptoSeed: parseSeed(cryptoSeed),
      })
      setResult(rolled)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown error'
      setError(`Invalid expression: ${message}`)
    }
  }

  return (
    <main>
      <Card mono="Rolls">
        <Stack>
          <h1>Dice Roller</h1>
          <Body>Enter a dice expression</Body>
          <TextInput label="Expression" value={expression} onChange={setExpression} />
          <TextInput label="Seed" value={seed} onChange={setSeed} />
          <label>
            <input
              type="checkbox"
              checked={crypto}
              onChange={(event) => setCrypto(event.target.checked)}
            />{' '}
            Crypto
          </label>
          <TextInput label="Crypto seed" value={cryptoSeed} onChange={setCryptoSeed} />
          <Button kind="primary" onClick={handleRoll}>
            Roll
          </Button>
          {error && (
            <div aria-live="polite">
              <Body style={{ color: 'var(--accent)' }}>
                {error}
              </Body>
            </div>
          )}
          {result ? (
            <Stack>
              <KpiRow>
                <Kpi value={`Total: ${result.total}`} label="Result" accent />
              </KpiRow>
              <Table
                columns={[
                  { key: 'term', label: 'Term' },
                  { key: 'value', label: 'Value', num: true },
                ]}
                rows={result.terms.map((term) => ({
                  cells: { term: term.label, value: term.value },
                }))}
              />
            </Stack>
          ) : (
            <Body>No rolls yet</Body>
          )}
        </Stack>
      </Card>
    </main>
  )
}
