import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  SectionLabel,
  Stack,
  Tag,
  Table,
  TextInput,
} from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { DEFAULT_SETTINGS, host } from './host'
import type { Settings } from './host'

const MIN_LENGTH = 4
const MAX_LENGTH = 64
const HISTORY_LIMIT = 8

const SETS = [
  { key: 'lowercase', label: 'Lowercase', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { key: 'uppercase', label: 'Uppercase', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { key: 'digits', label: 'Digits', chars: '0123456789' },
  { key: 'symbols', label: 'Symbols', chars: '!@#$%^&*()-_=+[]{};:,.<>?/~' },
] as const

type SetKey = (typeof SETS)[number]['key']

function strengthOf(length: number, sets: SetKey[]): 'Weak' | 'Fair' | 'Good' | 'Strong' {
  const poolSize = SETS.filter((set) => sets.includes(set.key)).reduce((n, set) => n + [...set.chars].length, 0)
  const bits = length * Math.log2(poolSize)
  if (bits < 50) return 'Weak'
  if (bits < 80) return 'Fair'
  if (bits < 110) return 'Good'
  return 'Strong'
}

function generatePassword(length: number, sets: SetKey[]): string {
  const pool = SETS.filter((set) => sets.includes(set.key)).flatMap((set) => [...set.chars])
  const out: string[] = []
  for (let i = 0; i < length; i += 1) {
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out.join('')
}

const TIER_ROWS = [
  { tier: 'Weak', bits: 'Under 50 bits', note: 'Guessable quickly. Fine for throwaway codes, not for accounts.' },
  { tier: 'Fair', bits: '50 to 79 bits', note: 'Ok for a local app. Keep it short-lived.' },
  { tier: 'Good', bits: '80 to 109 bits', note: 'Solid for most personal accounts.' },
  { tier: 'Strong', bits: '110 bits and up', note: 'Holds up against serious offline attacks.' },
]

interface HistoryEntry {
  value: string
  length: number
  tier: string
  bits: number
}

const INITIAL = host.loadSettings() ?? DEFAULT_SETTINGS

export function App() {
  const [settings, setSettings] = useState<Settings>(INITIAL)
  const [lengthText, setLengthText] = useState(String(INITIAL.length))
  const [password, setPassword] = useState('')
  const [strength, setStrength] = useState('')
  const [bits, setBits] = useState(0)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const applySettings = (next: Settings, length?: number) => {
    setSettings(next)
    host.saveSettings(next)
    if (length != null) setLengthText(String(length))
  }

  const toggle = (key: SetKey) => {
    setSettings((current) => {
      const next = { ...current, [key]: !current[key] }
      host.saveSettings(next)
      return next
    })
  }

  const selected = SETS.filter((set) => settings[set.key]).map((set) => set.key)

  const onGenerate = () => {
    const length = Number(lengthText)
    if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
      setPassword('')
      setStrength('')
      setBits(0)
      setError('Length must be between 4 and 64')
      return
    }
    if (selected.length === 0) {
      setPassword('')
      setStrength('')
      setBits(0)
      setError('Choose at least one character set')
      return
    }
    setError('')
    const value = generatePassword(length, selected)
    const tier = strengthOf(length, selected)
    const poolSize = SETS.filter((set) => selected.includes(set.key)).reduce((n, set) => n + [...set.chars].length, 0)
    setPassword(value)
    setStrength(tier)
    setBits(Math.round(length * Math.log2(poolSize)))
    host.saveSettings({ ...settings, length })
    setHistory((current) => [{ value, length, tier, bits: Math.round(length * Math.log2(poolSize)) }, ...current].slice(0, HISTORY_LIMIT))
  }

  const onCopy = () => {
    if (password) void copy(password)
  }

  const onSave = () => {
    if (password) saveText(password, { filename: 'password.txt', mimeType: 'text/plain' })
  }

  const onReset = () => {
    setLengthText(String(DEFAULT_SETTINGS.length))
    setSettings(DEFAULT_SETTINGS)
    host.saveSettings(DEFAULT_SETTINGS)
  }

  const meta = strength ? `Length ${lengthText} · ${strength}` : `Length ${lengthText} · ${selected.length} of 4 sets`
  const status = copied ? 'Copied to clipboard' : strength ? `Strength ${strength} · ${bits} bits · local` : 'Local · settings saved on this device'

  return (
    <AppShell
      name="Password Generator"
      icon="grid"
      hue="blue"
      category="Productivity"
      meta={meta}
      status={status}
      side={
        <Rail title="Password Generator" note="One page · local" chips={['Copy', 'Save as file', 'Settings persist']}>
          <Body sm>
            Passwords are mixed from the character sets you pick and never leave this device. Settings
            and the recent list are stored on this machine only.
          </Body>
        </Rail>
      }
    >
      <Card mono="Setup" title="Character mix">
        <FormGrid>
          <TextInput
            label="Length"
            type="number"
            value={lengthText}
            onChange={(value) => {
              setLengthText(value)
              const length = Number(value)
              if (Number.isInteger(length) && length >= MIN_LENGTH && length <= MAX_LENGTH) {
                const next = { ...settings, length }
                setSettings(next)
                host.saveSettings(next)
              }
            }}
          />
        </FormGrid>
        <SectionLabel>Include</SectionLabel>
        <Stack>
          {SETS.map((set) => (
            <Checkbox key={set.key} label={set.label} checked={settings[set.key]} onChange={() => toggle(set.key)} />
          ))}
        </Stack>
        <Actions>
          <Button kind="primary" onClick={onGenerate}>Generate</Button>
          <Button kind="secondary" onClick={onReset}>Reset to defaults</Button>
        </Actions>
        {error && <ErrorState title={error} detail="Fix the highlighted field, then press Generate again." />}
      </Card>

      <Card mono="Result" title="Password">
        <Stack>
          <label className="lc-field">
            <span className="lc-field-label">Password</span>
            <input
              className={`lc-input${password ? ' filled' : ''}`}
              type="text"
              value={password}
              readOnly
              aria-readonly="true"
              aria-invalid={error ? true : undefined}
            />
          </label>
          {password ? (
            <>
              <KpiRow>
                <Kpi value={password.length} label="Characters" />
                <Kpi value={bits} label="Entropy bits" accent />
              </KpiRow>
              <MonoLabel>Strength: {strength}</MonoLabel>
              <div data-testid="tier-chip">
                <Tag accent>{strength}</Tag>
              </div>
            </>
          ) : (
            <EmptyState
              mono="Empty"
              title="No password yet"
              detail="Pick a length and at least one character set, then press Generate."
            />
          )}
          <Actions>
            <Button kind="secondary" onClick={onCopy} disabled={!password}>{copied ? 'Copied' : 'Copy'}</Button>
            <Button kind="ghost" onClick={onSave} disabled={!password}>Save as file</Button>
          </Actions>
        </Stack>
      </Card>

      <Card mono={`${history.length} kept`} title="Recent passwords">
        {history.length === 0 ? (
          <EmptyState mono="Empty" title="Nothing generated yet" detail="Your last eight passwords appear here, newest first." />
        ) : (
          <List>
            {history.map((entry) => (
              <Row
                key={entry.value + String(entry.length)}
                title={entry.value}
                meta={`${entry.length} chars · ${entry.tier}`}
                value={`${entry.bits} bits`}
              />
            ))}
          </List>
        )}
      </Card>

      <Card mono="Reference" title="What strength means">
        <Table
          label="Strength tiers"
          columns={[
            { key: 'tier', label: 'Tier' },
            { key: 'bits', label: 'Entropy' },
            { key: 'note', label: 'What it holds up to' },
          ]}
          rows={TIER_ROWS.map((row) => ({
            cells: { tier: row.tier, bits: row.bits, note: row.note },
            hot: row.tier === strength,
          }))}
        />
      </Card>
    </AppShell>
  )
}
