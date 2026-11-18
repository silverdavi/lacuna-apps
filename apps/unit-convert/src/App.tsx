import { useEffect, useState } from 'react'
import { addRecent, listRecent, type ConversionRecord } from './host'
import { Cols, Divider, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'

interface Unit {
  name: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const CATEGORIES: Record<string, { label: string; units: Unit[] }> = {
  length: {
    label: 'Length',
    units: [
      { name: 'Meters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Kilometers', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { name: 'Feet', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { name: 'Inches', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { name: 'Miles', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
    ],
  },
  mass: {
    label: 'Mass',
    units: [
      { name: 'Kilograms', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Grams', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: 'Pounds', toBase: (v) => v * 0.45359237, fromBase: (v) => v / 0.45359237 },
      { name: 'Ounces', toBase: (v) => v * 0.028349523125, fromBase: (v) => v / 0.028349523125 },
      { name: 'Tonnes', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
    ],
  },
  volume: {
    label: 'Volume',
    units: [
      { name: 'Liters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Milliliters', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { name: 'Gallons', toBase: (v) => v * 3.785411784, fromBase: (v) => v / 3.785411784 },
      { name: 'Cups', toBase: (v) => v * 0.2365882365, fromBase: (v) => v / 0.2365882365 },
      { name: 'Tablespoons', toBase: (v) => v * 0.01478676478, fromBase: (v) => v / 0.01478676478 },
    ],
  },
  temperature: {
    label: 'Temperature',
    units: [
      { name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  area: {
    label: 'Area',
    units: [
      { name: 'Square meters', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Square kilometers', toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { name: 'Square feet', toBase: (v) => v * 0.09290304, fromBase: (v) => v / 0.09290304 },
      { name: 'Acres', toBase: (v) => v * 4046.8564224, fromBase: (v) => v / 4046.8564224 },
      { name: 'Hectares', toBase: (v) => v * 10000, fromBase: (v) => v / 10000 },
    ],
  },
}

const ORDER = ['length', 'mass', 'volume', 'temperature', 'area']

function fmt(value: number): string {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const digits = abs >= 1e9 || abs < 1e-6 ? 3 : 6
  let s = value.toPrecision(digits)
  if (s.includes('e')) s = Number(s).toString()
  if (s.includes('.') && !s.includes('e')) s = s.replace(/0+$/, '').replace(/\.$/, '')
  return s
}

function unitIndex(category: string, name: string): number {
  return CATEGORIES[category].units.findIndex((u) => u.name === name)
}

export function App() {
  const [category, setCategory] = useState('length')
  const [fromUnit, setFromUnit] = useState(CATEGORIES.length.units[0].name)
  const [toUnit, setToUnit] = useState(CATEGORIES.length.units[2].name)
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [lastTouched, setLastTouched] = useState<'from' | 'to'>('from')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<ConversionRecord[]>(() => listRecent())

  useEffect(() => {
    setRecent(listRecent())
  }, [])

  const from = CATEGORIES[category].units[unitIndex(category, fromUnit)]
  const to = CATEGORIES[category].units[unitIndex(category, toUnit)]

  const committed = () => {
    if (lastTouched === 'from') {
      if (!fromText.trim()) return
      const parsed = Number(fromText)
      if (!Number.isFinite(parsed)) {
        setError('Type a number, like 2.5')
        setToText('')
        return
      }
      setError('')
      const out = fmt(to.fromBase(from.toBase(parsed)))
      setToText(out)
      setRecent(addRecent({ category, fromUnit, toUnit, fromValue: fmt(parsed), toValue: out }))
    } else {
      if (!toText.trim()) return
      const parsed = Number(toText)
      if (!Number.isFinite(parsed)) {
        setError('Type a number, like 2.5')
        setFromText('')
        return
      }
      setError('')
      const out = fmt(from.fromBase(to.toBase(parsed)))
      setFromText(out)
      setRecent(addRecent({ category, fromUnit, toUnit, fromValue: out, toValue: fmt(parsed) }))
    }
  }

  const switchCategory = (next: string) => {
    if (next === category) return
    setCategory(next)
    const units = CATEGORIES[next].units
    setFromUnit(units[0].name)
    setToUnit(units[1].name)
    setFromText('')
    setToText('')
    setError('')
    setLastTouched('from')
  }

  const swap = () => {
    const a = fromUnit
    const b = toUnit
    setFromUnit(b)
    setToUnit(a)
    const at = fromText
    const bt = toText
    setFromText(bt)
    setToText(at)
    setLastTouched(lastTouched === 'from' ? 'to' : 'from')
  }

  const restore = (record: ConversionRecord) => {
    setCategory(record.category)
    setFromUnit(record.fromUnit)
    setToUnit(record.toUnit)
    setFromText(record.fromValue)
    setToText(record.toValue)
    setError('')
    setLastTouched('from')
  }

  const unitNames = CATEGORIES[category].units.map((u) => u.name)

  return (
    <main>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
        <section>
          <MonoLabel sm>Converter</MonoLabel>
          <Title size="md">Unit convert</Title>
        </section>
        <div role="tablist" aria-label="Conversion categories" style={{ display: 'flex', gap: 'calc(20px * var(--sf))' }}>
          {ORDER.map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={c === category}
              className={`lc-tab${c === category ? ' active' : ''}`}
              onClick={() => switchCategory(c)}
            >
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={CATEGORIES[category].label}>
          <Cols kind="2">
            <section>
              <div role="radiogroup" aria-label={`From unit (${CATEGORIES[category].label})`} style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--sf))' }}>
                {unitNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={name === fromUnit}
                    className={`lc-pill${name === fromUnit ? ' active' : ''}`}
                    onClick={() => setFromUnit(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <TextInput
                label={`Value in ${fromUnit}`}
                value={fromText}
                onChange={(v) => {
                  setFromText(v)
                  setLastTouched('from')
                  setError('')
                }}
              />
            </section>
            <section>
              <div role="radiogroup" aria-label={`To unit (${CATEGORIES[category].label})`} style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(6px * var(--sf))' }}>
                {unitNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={name === toUnit}
                    className={`lc-pill${name === toUnit ? ' active' : ''}`}
                    onClick={() => setToUnit(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <TextInput
                label={`Value in ${toUnit}`}
                value={toText}
                onChange={(v) => {
                  setToText(v)
                  setLastTouched('to')
                  setError('')
                }}
              />
            </section>
          </Cols>
          {error && (
            <div role="alert" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 'calc(10px * var(--tf))', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {error}
            </div>
          )}
        </div>
        <Stack>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <button type="button" className="lc-btn secondary" onClick={committed}>
              Convert
            </button>
            <button type="button" className="lc-btn secondary" onClick={swap}>
              Swap units
            </button>
          </div>
        </Stack>
        <Divider />
        <section>
          <MonoLabel sm>Recent</MonoLabel>
          <Title size="md">Recent conversions</Title>
          {recent.length === 0 ? (
            <MonoLabel faint>No conversions yet. Type a value and press Convert.</MonoLabel>
          ) : (
            <ul>
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="lc-btn secondary"
                    onClick={() => restore(r)}
                    data-recent
                  >
                    {fmt(Number(r.fromValue))} {r.fromUnit} = {fmt(Number(r.toValue))} {r.toUnit} · {CATEGORIES[r.category]?.label ?? r.category}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
