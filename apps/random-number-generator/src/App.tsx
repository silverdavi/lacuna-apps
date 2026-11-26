import { useEffect, useRef, useState } from 'react'
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
  KpiRow,
  MonoLabel,
  Rail,
  SectionLabel,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { generationStore } from './host'
import type { GenerationSettings, GenerationSession } from './host'

const HISTORY_CAP = 1000
const MAX_ROLLS = 1000

interface RollRow {
  value: number
  running: number
}

interface HistoryEntry {
  seed: string
  label: string
  rows: RollRow[]
}

type FieldErrors = Partial<Record<'min' | 'max' | 'count' | 'dice', string>>

function validate(settings: GenerationSettings): { errors: FieldErrors; message?: string } {
  const errors: FieldErrors = {}
  const dice = settings.dice.trim()
  if (dice && !/^[1-9][0-9]*d[0-9]+$/.test(dice)) {
    errors.dice = 'Dice notation must look like 2d6'
    return { errors, message: errors.dice }
  }
  if (dice) {
    const [count, sides] = /^(\d+)d(\d+)$/.exec(dice)!
    if (Number(count) > MAX_ROLLS) errors.dice = `Dice count is capped at ${MAX_ROLLS}`
    if (Number(sides) > MAX_ROLLS) errors.dice = `Dice sides are capped at ${MAX_ROLLS}`
    return { errors }
  }
  const minText = settings.min.trim()
  const maxText = settings.max.trim()
  const countText = settings.count.trim()
  if (!minText || !maxText) {
    errors.min = 'Set Min and Max'
    errors.max = 'Set Min and Max'
    return { errors, message: 'Set Min and Max, or use Dice Notation' }
  }
  const min = Number(minText)
  const max = Number(maxText)
  if (!Number.isInteger(min)) {
    errors.min = 'Whole numbers only'
  }
  if (!Number.isInteger(max)) {
    errors.max = 'Whole numbers only'
  }
  if (Number.isInteger(min) && Number.isInteger(max) && min >= max) {
    errors.min = 'Min must be less than Max'
    return { errors, message: 'Min must be less than Max' }
  }
  if (countText !== '' && (!Number.isInteger(Number(countText)) || Number(countText) < 1 || Number(countText) > MAX_ROLLS)) {
    errors.count = `Count is a whole number from 1 to ${MAX_ROLLS}`
  }
  return { errors }
}

function rollCount(settings: GenerationSettings): number {
  const dice = settings.dice.trim()
  if (dice) return Number(/^(\d+)d(\d+)$/.exec(dice)?.[1] ?? 1)
  const countText = settings.count.trim()
  return countText === '' ? 1 : Number(countText)
}

function makeSeed(): string {
  const word = () =>
    Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('')
  return `${word()}-${word()}-${word()}`
}

function rollRow(label: string, roll: () => number, count: number): HistoryEntry {
  const rows: RollRow[] = []
  let running = 0
  for (let i = 0; i < count; i += 1) {
    const value = roll()
    running += value
    rows.push({ value, running })
  }
  return { seed: makeSeed(), label, rows }
}

function generate(settings: GenerationSettings): HistoryEntry {
  const dice = settings.dice.trim()
  if (dice) {
    const match = /^(\d+)d(\d+)$/.exec(dice)!
    const count = Number(match[1])
    const sides = Number(match[2])
    return rollRow(
      `${count}d${sides}`,
      () => 1 + Math.floor(Math.random() * sides),
      count,
    )
  }
  const min = Number(settings.min.trim())
  const max = Number(settings.max.trim())
  const count = rollCount(settings)
  return rollRow(
    `${settings.min.trim()} to ${settings.max.trim()}`,
    () => min + Math.floor(Math.random() * (max - min + 1)),
    count,
  )
}

function historyFromSession(session: GenerationSession): HistoryEntry[] {
  return (session.history ?? [])
    .filter((entry) => entry && Array.isArray(entry.rows) && entry.rows.length > 0)
    .map((entry) => ({
      seed: typeof entry.seed === 'string' ? entry.seed : '',
      label: typeof entry.label === 'string' ? entry.label : '',
      rows: entry.rows
        .filter((row) => row && Number.isFinite(row.value))
        .map((row, index, list) => ({
          value: row.value,
          running: list.slice(0, index + 1).reduce((sum, r) => sum + r.value, 0),
        })),
    }))
    .filter((entry) => entry.rows.length > 0)
}

export function App() {
  const [settings, setSettings] = useState<GenerationSettings>({ min: '', max: '', count: '', dice: '' })
  const [last, setLast] = useState<GenerationSession['last']>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [preset, setPreset] = useState<string | null>(null)
  const ready = useRef(false)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  useEffect(() => {
    let alive = true
    generationStore.load().then((session) => {
      if (!alive) return
      ready.current = true
      setSettings(session.settings)
      setLast(session.last)
      setHistory(historyFromSession(session))
      setPreset(session.preset ?? null)
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
      preset,
      history: history.map((entry) => ({ ...entry, id: entry.seed })),
    })
  }, [settings, last, preset, history])

  const setField = (field: 'min' | 'max' | 'count' | 'dice', value: string) => {
    setSettings((current) => ({ ...current, [field]: value }))
  }

  const onGenerate = () => {
    const { errors, message } = validate(settings)
    setFieldErrors(errors)
    if (message) {
      setError(message)
      return
    }
    setError('')
    const entry = generate(settings)
    setHistory((current) => {
      const next = [...current, entry]
      return next.length > HISTORY_CAP ? next.slice(next.length - HISTORY_CAP) : next
    })
    setLast({ result: entry.rows[entry.rows.length - 1]!.running, seed: entry.seed })
  }

  const onClear = () => {
    setHistory([])
    setLast(null)
  }

  const onReset = () => {
    const cleared = { min: '', max: '', count: '', dice: '' }
    setSettings(cleared)
    setFieldErrors({})
    setError('')
    setPreset(null)
  }

  const onSavePreset = () => {
    setPreset(JSON.stringify(settings))
  }

  const onCopySeed = () => {
    if (last?.seed) void copy(last.seed)
  }

  const tableRows = history.flatMap((entry) =>
    entry.rows.map((row, index) => ({
      cells: {
        seed: index === 0 ? entry.seed : null,
        roll: index === 0 ? entry.label : null,
        value: String(row.value),
        running: String(row.running),
      },
      hot: index === entry.rows.length - 1,
    })),
  )

  const totalRows = history.reduce((sum, entry) => sum + entry.rows.length, 0)
  const resultValue = last ? String(last.result) : ''
  const seedValue = last?.seed ?? ''

  return (
    <AppShell
      name="Random Number Generator"
      icon="grid"
      hue="blue"
      category="Apps"
      meta="Local only"
      status={copied ? 'Copied to clipboard' : 'Saved on this device'}
      side={
        <Rail title="Last result" note="Local only" chips={['History', 'Copy seed', 'Settings persist']}>
          <Stack>
            <label className="lc-field">
              <span className="lc-field-label">Result</span>
              <input
                className={`lc-input${resultValue ? ' filled' : ''}`}
                value={resultValue}
                readOnly
                aria-label="Result"
                onChange={() => undefined}
              />
            </label>
            <label className="lc-field">
              <span className="lc-field-label">Seed</span>
              <output className="lc-mono" aria-label="Seed">
                {seedValue || '—'}
              </output>
            </label>
            <Actions>
              <Button kind="ghost" onClick={onCopySeed} disabled={!seedValue}>
                {copied ? 'Copied' : 'Copy seed'}
              </Button>
            </Actions>
          </Stack>
          {error ? (
            <ErrorState title="Invalid input" detail="Fix the highlighted fields, then press Generate." />
          ) : (
            <Body sm>
              Every roll lands in the history table below. Results, the seed and your settings stay on this
              device.
            </Body>
          )}
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="Roll" title="Random number generator">
          <FormGrid>
            <TextInput
              label="Min"
              value={settings.min}
              onChange={(value) => setField('min', value)}
              error={fieldErrors.min ?? null}
            />
            <TextInput
              label="Max"
              value={settings.max}
              onChange={(value) => setField('max', value)}
              error={fieldErrors.max ?? null}
            />
            <TextInput
              label="Count"
              value={settings.count}
              onChange={(value) => setField('count', value)}
              error={fieldErrors.count ?? null}
            />
            <TextInput
              label="Dice Notation"
              value={settings.dice}
              onChange={(value) => setField('dice', value)}
              error={fieldErrors.dice ?? null}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={onGenerate}>
              Generate
            </Button>
            <Button kind="secondary" onClick={onSavePreset} disabled={!validate(settings).errors}>
              Save settings
            </Button>
            <Button kind="ghost" onClick={onReset}>
              Reset
            </Button>
          </Actions>
          {preset && <Tag accent>Settings saved</Tag>}
        </Card>

        <Card mono={`${history.length} batches · ${totalRows} rolls`} title="Breakdown">
          {history.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No rolls yet"
              detail="Set a range or a dice roll and press Generate; each roll gets a row here."
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
          {history.length > 0 && (
            <Stack style={{ marginTop: 'calc(14px * var(--sf))' }}>
              <Button kind="ghost" onClick={onClear}>
                Clear history
              </Button>
            </Stack>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
