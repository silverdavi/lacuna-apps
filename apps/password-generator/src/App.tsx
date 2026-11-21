import { useEffect, useState } from 'react'
import { AppShell, Button, Card, Checkbox, MonoLabel, Stack, TextInput } from '@lacuna/ui'
import { DEFAULT_SETTINGS, host } from './host'
import type { Settings } from './host'

const MIN_LENGTH = 4
const MAX_LENGTH = 64

const SETS = [
  { key: 'lowercase', label: 'Lowercase', chars: 'abcdefghijklmnopqrstuvwxyz' },
  { key: 'uppercase', label: 'Uppercase', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { key: 'digits', label: 'Digits', chars: '0123456789' },
  { key: 'symbols', label: 'Symbols', chars: '!@#$%^&*()-_=+[]{};:,.<>?/~' },
] as const

type SetKey = (typeof SETS)[number]['key']

function generatePassword(length: number, sets: SetKey[]): string {
  const pool = SETS.filter((set) => sets.includes(set.key)).flatMap((set) => [...set.chars])
  const out: string[] = []
  for (let i = 0; i < length; i += 1) {
    out.push(pool[Math.floor(Math.random() * pool.length)])
  }
  return out.join('')
}

function strengthOf(length: number, sets: SetKey[]): 'Weak' | 'Fair' | 'Good' | 'Strong' {
  const poolSize = SETS.filter((set) => sets.includes(set.key)).reduce((n, set) => n + [...set.chars].length, 0)
  const bits = length * Math.log2(poolSize)
  if (bits < 50) return 'Weak'
  if (bits < 80) return 'Fair'
  if (bits < 110) return 'Good'
  return 'Strong'
}

export function App() {
  const [settings, setSettings] = useState<Settings>(() => host.loadSettings() ?? DEFAULT_SETTINGS)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [strength, setStrength] = useState<'' | 'Weak' | 'Fair' | 'Good' | 'Strong'>('')
  const [lengthText, setLengthText] = useState(String(settings.length))

  useEffect(() => {
    host.saveSettings(settings)
  }, [settings])

  const toggle = (key: SetKey) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }))
  }

  const selected = SETS.filter((set) => settings[set.key]).map((set) => set.key)

  const onGenerate = () => {
    const length = Number(lengthText)
    if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
      setPassword('')
      setStrength('')
      setError('Length must be between 4 and 64')
      return
    }
    if (selected.length === 0) {
      setPassword('')
      setStrength('')
      setError('Choose at least one character set')
      return
    }
    setError('')
    const value = generatePassword(length, selected)
    setPassword(value)
    setStrength(strengthOf(length, selected))
  }

  return (
    <AppShell name="Password Generator" icon="grid" hue="rust" category="Productivity">
      <Card mono="Generator">
        <Stack>
          <TextInput
            label="Length"
            type="number"
            value={lengthText}
            onChange={(value) => {
              setLengthText(value)
              setSettings((current) => {
                const length = Number(value)
                if (Number.isInteger(length) && length >= MIN_LENGTH && length <= MAX_LENGTH) {
                  return { ...current, length }
                }
                return current
              })
            }}
          />
          <Stack>
            {SETS.map((set) => (
              <Checkbox key={set.key} label={set.label} checked={settings[set.key]} onChange={() => toggle(set.key)} />
            ))}
          </Stack>
          <Button kind="primary" onClick={onGenerate}>
            Generate
          </Button>
          <label className="lc-field">
            <span className="lc-field-label">Password</span>
            <input className="lc-input filled" readOnly value={password} />
          </label>
          {error && <MonoLabel accent>{error}</MonoLabel>}
          {strength && <MonoLabel>Strength: {strength}</MonoLabel>}
        </Stack>
      </Card>
    </AppShell>
  )
}
