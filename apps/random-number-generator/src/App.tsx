import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Rail, Stack, Table, TextInput } from '@lacuna/ui'
import { generationStore } from './host'
import type { GenerationSession } from './host'

const HISTORY_CAP = 1000

function makeSeed(): string {
  const word = () =>
    Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')
  return `${word()}-${word()}-${word()}`
}

function randomInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

interface RollRow {
  value: number
  running: number
}

interface HistoryState {
  seed: string
  label: string
  rows: RollRow[]
}

interface GenerateOutcome {
  entry: HistoryState
  result: number
  error?: string
}

function emptyEntry(): HistoryState {
  return { seed: '', label: '', rows: [] }
}

function rollEntry(label: string, roll: () => number, count: number): GenerateOutcome {
  const rows: RollRow[] = []
  let running = 0
  for (let i = 0; i < count; i++) {
    const value = roll()
    running += value
    rows.push({ value, running })
  }
  return {
    entry: { seed: makeSeed(), label, rows },
    result: rows.length > 0 ? rows[rows.length - 1].running : 0,
  }
}

function generate(settings: GenerationSession['settings']): GenerateOutcome {
  const dice = settings.dice.trim()
  if (dice) {
    const match = /^(\d{1,3})d(\d{1,3})$/.exec(dice.toLowerCase())
    if (!match) {
      return { entry: emptyEntry(), result: 0, error: 'Dice notation must look like 2d6' }
    }
    const rolls = Number(match[1])
    const sides = Number(match[2])
    return rollEntry(`${rolls}d${sides}`, () => randomInt(1, sides), rolls)
  }

  const minText = settings.min.trim()
  const maxText = settings.max.trim()
  if (!minText || !maxText) {
    return { entry: emptyEntry(), result: 0, error: 'Set Min and Max, or use Dice Notation' }
  }
  const min = Number(minText)
  const max = Number(maxText)
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { entry: emptyEntry(), result: 0, error: 'Min and Max must be whole numbers' }
  }
  if (min >= max) {
    return { entry: emptyEntry(), result: 0, error: 'Min must be less than Max' }
  }
  const countText = settings.count.trim()
  const count = countText === '' ? 1 : Number(countText)
  if (!Number.isInteger(count) || count < 1 || count > 1000) {
    return { entry: emptyEntry(), result: 0, error: 'Count must be a whole number from 1 to 1000' }
  }
  return rollEntry(`${min} to ${max}`, () => randomInt(min, max), count)
}

function historyFromSession(session: GenerationSession): HistoryState[] {
  return (session.history ?? [])
    .filter((entry) => entry && Array.isArray(entry.rows) && entry.rows.length > 0)
    .map((entry) => ({
      seed: typeof entry.seed === 'string' ? entry.seed : '',
      label: typeof entry.label === 'string' ? entry.label : '',
      rows: entry.rows
        .filter((row) => row && Number.isFinite(row.value))
        .map((row, index, list) => ({
          value: row.value,
          running: list.slice(0, index + 1).reduce((s, r) => s + r.value, 0),
        })),
    }))
    .filter((entry) => entry.rows.length > 0)
}

export function App() {
  const [settings, setSettings] = useState<GenerationSession['settings']>({ min: '', max: '', count: '', dice: '' })
  const [last, setLast] = useState<GenerationSession['last']>(null)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [error, setError] = useState('')
  const ready = useRef(false)

  useEffect(() => {
    let alive = true
    generationStore.load().then((session) => {
      if (!alive) return
      ready.current = true
      setSettings(session.settings)
      setLast(session.last)
      setHistory(historyFromSession(session))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!ready.current) return
    void generationStore.save({
      settings,
      last,
      history: history.map((entry) => ({ ...entry, id: entry.seed })),
    })
  }, [settings, last, history])

  const onGenerate = () => {
    const outcome = generate(settings)
    if (outcome.error) {
      setError(outcome.error)
      return
    }
    setError('')
    const next = [...history, outcome.entry]
    setHistory(next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next)
    setLast({ result: outcome.result, seed: outcome.entry.seed })
  }

  const tableRows = history.flatMap((entry) =>
    entry.rows.map((row, rowIndex) => ({
      cells: {
        seed: rowIndex === 0 ? entry.seed : null,
        roll: rowIndex === 0 ? entry.label : null,
        value: String(row.value),
        running: String(row.running),
      },
    })),
  )

  const resultValue = last ? String(last.result) : ''
  const seedValue = last?.seed ?? ''

  return (
    <AppShell
      name="Random Number Generator"
      icon="grid"
      hue="blue"
      category="Apps"
      meta="Local only"
      status="Saved on this device"
      side={
        <Rail title="Last result" note="Local only">
          <Stack>
            <label className="lc-field">
              <span className="lc-field-label">Result</span>
              <input
                className="lc-input"
                value={resultValue}
                readOnly
                aria-label="Result"
                onChange={() => undefined}
              />
            </label>
            <label className="lc-field">
              <span className="lc-field-label">Seed</span>
              <output className="lc-mono" aria-label="Seed">
                {seedValue}
              </output>
            </label>
          </Stack>
          {error && <p role="alert">{error}</p>}
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="Roll" title="Random number generator">
          <FormGrid>
            <TextInput label="Min" value={settings.min} onChange={(v) => setSettings({ ...settings, min: v })} />
            <TextInput label="Max" value={settings.max} onChange={(v) => setSettings({ ...settings, max: v })} />
            <TextInput label="Count" value={settings.count} onChange={(v) => setSettings({ ...settings, count: v })} />
            <TextInput
              label="Dice Notation"
              value={settings.dice}
              onChange={(v) => setSettings({ ...settings, dice: v })}
            />
          </FormGrid>
          <Button kind="primary" onClick={onGenerate}>
            Generate
          </Button>
        </Card>
        <Card mono={`${history.length} rolls`} title="History">
          {history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No rolls yet"
              detail="Set a range or a dice roll and press Generate."
            />
          ) : (
            <Table
              label="History"
              columns={[
                { key: 'seed', label: 'Seed' },
                { key: 'roll', label: 'Roll' },
                { key: 'value', label: 'Value', num: true },
                { key: 'running', label: 'Running total', num: true },
              ]}
              rows={tableRows}
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
