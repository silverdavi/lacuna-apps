import { useEffect, useRef, useState } from 'react'
import { Button, Card, Cols, Stack, TextInput } from '@lacuna/ui'
import { generationStore } from './host'
import type { GenerationSession } from './host'
import './app.css'

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

function historyFromSession(session: GenerationSession): HistoryState[] {
  return (session.history ?? [])
    .filter((entry) => entry && Array.isArray(entry.rows) && entry.rows.length > 0)
    .map((entry) => ({
      seed: typeof entry.seed === 'string' ? entry.seed : '',
      label: typeof entry.label === 'string' ? entry.label : '',
      rows: entry.rows
        .filter((row) => row && Number.isFinite(row.value))
        .map((row, index, list) => ({ value: row.value, running: list.slice(0, index + 1).reduce((s, r) => s + r.value, 0) })),
    }))
    .filter((entry) => entry.rows.length > 0)
}

export function App() {
  const [settings, setSettings] = useState<GenerationSession['settings']>({ min: '', max: '', count: '', dice: '' })
  const [last, setLast] = useState<GenerationSession['last']>(null)
  const [history, setHistory] = useState<HistoryState[]>([])
  const [error, setError] = useState('')
  const ready = useRef(false)
  const errorRef = useRef<HTMLParagraphElement | null>(null)

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
    void generationStore.save({ settings, last, history: history.map((entry) => ({ ...entry, id: entry.seed })) })
  }, [settings, last, history])

  const onGenerate = () => {
    const outcome = generate(settings)
    if (outcome.error) {
      setError(outcome.error)
      errorRef.current?.focus()
      return
    }
    setError('')
    const next = [...history, outcome.entry]
    setHistory(next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next)
    setLast({ result: outcome.result, seed: outcome.entry.seed })
  }

  let rowKey = 0
  return (
    <main className="rng-page">
      <Card mono="Productivity" title="Random number generator">
        <Stack lg>
          <Cols kind="main-side">
            <div>
              <TextInput label="Min" value={settings.min} onChange={(v) => setSettings({ ...settings, min: v })} />
              <TextInput label="Max" value={settings.max} onChange={(v) => setSettings({ ...settings, max: v })} />
              <TextInput label="Count" value={settings.count} onChange={(v) => setSettings({ ...settings, count: v })} />
              <TextInput
                label="Dice Notation"
                value={settings.dice}
                onChange={(v) => setSettings({ ...settings, dice: v })}
              />
              <Button kind="primary" onClick={onGenerate}>
                Generate
              </Button>
            </div>
            <div>
              <TextInput label="Result" value={last ? String(last.result) : ''} onChange={() => undefined} />
              <div className="rng-seed-field">
                <span className="rng-field-label" id="rng-seed-label">
                  Seed
                </span>
                <output aria-labelledby="rng-seed-label">{last?.seed ?? ''}</output>
              </div>
              {error && (
                <p ref={errorRef} tabIndex={-1} className="rng-error">
                  {error}
                </p>
              )}
              <span className="rng-note">Nothing leaves this device</span>
            </div>
          </Cols>
          <Card mono="History" title="History">
            {history.length === 0 ? (
              <p className="rng-empty">No rolls yet. Set a range or a dice roll and press Generate.</p>
            ) : (
              <table className="lc-table">
                <caption className="rng-caption">History</caption>
                <thead>
                  <tr>
                    <th>Seed</th>
                    <th>Roll</th>
                    <th className="num">Value</th>
                    <th className="num">Running total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.flatMap((entry, entryIndex) =>
                    entry.rows.map((row, rowIndex) => {
                      const isLast =
                        entryIndex === history.length - 1 && rowIndex === entry.rows.length - 1
                      const key = `${entryIndex}:${rowIndex}`
                      rowKey += 1
                      if (rowIndex === 0) {
                        return [
                          <tr key={key} className={isLast ? 'hot' : undefined}>
                            <td rowSpan={entry.rows.length}>
                              <span className="rng-seed-cell">{entry.seed}</span>
                            </td>
                            <td>{entry.label}</td>
                            <td className="num">{row.value}</td>
                            <td className="num">{row.running}</td>
                          </tr>,
                        ]
                      }
                      return [
                        <tr key={key} className={isLast ? 'hot' : undefined}>
                          <td>{''}</td>
                          <td className="num">{row.value}</td>
                          <td className="num">{row.running}</td>
                        </tr>,
                      ]
                    }),
                  )}
                </tbody>
              </table>
            )}
          </Card>
        </Stack>
      </Card>
    </main>
  )
}
