// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { rollDice, loadLastRoll, saveLastRoll, type RollResult, type RollRecord } from './host'

function parseSeed(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function termsFromRecord(record: RollRecord) {
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

export function App() {
  const [expression, setExpression] = useState('')
  const [seed, setSeed] = useState('')
  const [crypto, setCrypto] = useState(false)
  const [cryptoSeed, setCryptoSeed] = useState('')
  const [result, setResult] = useState<RollResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ready = useRef(false)

  useEffect(() => {
    let alive = true
    const record = loadLastRoll()
    if (alive && record) {
      setResult({ total: record.total, terms: termsFromRecord(record), record })
    }
    if (alive) {
      ready.current = true
    }
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!ready.current || !result) return
    saveLastRoll(result.record)
  }, [result])

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

  const tableRows = result?.terms.map((term) => ({
    cells: { term: term.label, value: String(term.value) },
  }))

  return (
    <AppShell
      name="Dice Roller"
      icon="grid"
      hue="cobalt"
      category="Games"
    >
      <Stack lg>
        <Card mono="Input" title="Expression">
          <FormGrid>
            <TextInput label="Expression" value={expression} onChange={setExpression} placeholder="2d6+3" />
            <TextInput label="Seed" value={seed} onChange={setSeed} inputMode="numeric" />
            <Checkbox label="Crypto" checked={crypto} onChange={setCrypto} />
            <TextInput label="Crypto seed" value={cryptoSeed} onChange={setCryptoSeed} inputMode="numeric" />
          </FormGrid>
          <Actions>
            <PrimaryButton onClick={handleRoll}>Roll</PrimaryButton>
          </Actions>
        </Card>

        {error ? (
          <ErrorState title="Invalid expression" detail={error} />
        ) : null}

        <Card mono="Result" title="Roll">
          {result ? (
            <Stack>
              <KpiRow>
                <Kpi value={`Total: ${result.total}`} label="Result" accent />
              </KpiRow>
              <Table
                label="Breakdown"
                columns={[
                  { key: 'term', label: 'Term' },
                  { key: 'value', label: 'Value', num: true },
                ]}
                rows={tableRows ?? []}
              />
            </Stack>
          ) : (
            <EmptyState
              mono="Empty"
              title="No rolls yet"
              detail="Enter a dice expression and press Roll."
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
