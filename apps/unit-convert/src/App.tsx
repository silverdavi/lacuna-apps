import { useEffect, useRef, useState } from 'react'
import { addRecent, listRecent, type ConversionRecord } from './host'
import { Cols, Divider, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'

interface Unit {
  name: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

const CATEGORIES: Record<string, { label: string; units: Unit[]; defaults: [number, number] }> = {
  length: {
    label: 'Length',
    defaults: [0, 2],
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
    defaults: [0, 2],
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
    defaults: [0, 2],
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
    defaults: [0, 1],
    units: [
      { name: 'Celsius', toBase: (v) => v, fromBase: (v) => v },
      { name: 'Fahrenheit', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { name: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  area: {
    label: 'Area',
    defaults: [0, 2],
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

function parse(text: string): number | null {
  const t = text.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function App() {
  const [category, setCategory] = useState('length')
  const [fromUnit, setFromUnit] = useState(CATEGORIES.length.units[CATEGORIES.length.defaults[0]].name)
  const [toUnit, setToUnit] = useState(CATEGORIES.length.units[CATEGORIES.length.defaults[1]].name)
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<ConversionRecord[]>(() => listRecent())
  const [resetKey, setResetKey] = useState(0)

  useEffect(() => {
    setRecent(listRecent())
  }, [])

  const formRef = useRef<HTMLFormElement>(null)

  // Read the live DOM values at submit time. A submit can fire in the same
  // event batch as the last fill, before React has committed the re-render,
  // so state/refs may still hold the previous value.
  const domValues = (): [string, string] => {
    const form = formRef.current
    if (!form) return [fromText, toText]
    const inputs = form.querySelectorAll<HTMLInputElement>('input')
    return [inputs[0]?.value ?? '', inputs[1]?.value ?? '']
  }

  const writeDom = (from: string, to: string) => {
    const form = formRef.current
    if (!form) return
    const inputs = form.querySelectorAll<HTMLInputElement>('input')
    if (inputs[0]) inputs[0].value = from
    if (inputs[1]) inputs[1].value = to
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const from = CATEGORIES[category].units[unitIndex(category, fromUnit)]
  const to = CATEGORIES[category].units[unitIndex(category, toUnit)]

  const updateFrom = (v: string) => {
    setFromText(v)
    const n = parse(v)
    if (n === null) {
      setError('')
      setToText('')
      return
    }
    setError('')
    setToText(fmt(to.fromBase(from.toBase(n))))
  }

  const updateTo = (v: string) => {
    setToText(v)
    const n = parse(v)
    if (n === null) {
      setError('')
      setFromText('')
      return
    }
    setError('')
    setFromText(fmt(from.fromBase(to.toBase(n))))
  }

  const commit = () => {
    if (error) return
    const [dFrom, dTo] = domValues()
    const nFrom = parse(dFrom)
    const nTo = parse(dTo)
    if (nFrom === null || nTo === null) return
    setFromText(dFrom)
    setToText(dTo)
    setRecent(addRecent({ category, fromUnit, toUnit, fromValue: fmt(nFrom), toValue: fmt(nTo) }))
  }

  const switchCategory = (next: string) => {
    if (next === category) return
    setCategory(next)
    const cfg = CATEGORIES[next]
    setFromUnit(cfg.units[cfg.defaults[0]].name)
    setToUnit(cfg.units[cfg.defaults[1]].name)
    setFromText('')
    setToText('')
    setError('')
  }

  const swap = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
    setFromText(fromText)
    setToText(toText)
  }

  const restore = (record: ConversionRecord) => {
    setCategory(record.category)
    setFromUnit(record.fromUnit)
    setToUnit(record.toUnit)
    setFromText(record.fromValue)
    setToText(record.toValue)
    setError('')
    setResetKey((k) => k + 1)
    writeDom(record.fromValue, record.toValue)
  }

  const unitNames = CATEGORIES[category].units.map((u) => u.name)

  return (
    <main>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
        <section>
          <MonoLabel sm>Converter</MonoLabel>
          <Title size="md">Unit convert</Title>
        </section>
        <div role="group" aria-label="Conversion categories" style={{ display: 'flex', gap: 'calc(20px * var(--sf))' }}>
          {ORDER.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={c === category}
              className={`lc-tab${c === category ? ' active' : ''}`}
              onClick={() => switchCategory(c)}
            >
              {CATEGORIES[c].label}
            </button>
          ))}
        </div>
        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); commit() }}>
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
                      onClick={() => {
                        setFromUnit(name)
                        const n = parse(fromText)
                        if (n !== null) {
                          setToText(fmt(CATEGORIES[category].units[unitIndex(category, name)].fromBase(from.toBase(n))))
                        }
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <TextInput key={`from-${resetKey}`} label={fromUnit} value={fromText} onChange={updateFrom} />
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
                      onClick={() => {
                        setToUnit(name)
                        const n = parse(toText)
                        if (n !== null) {
                          setFromText(fmt(CATEGORIES[category].units[unitIndex(category, name)].fromBase(to.toBase(n))))
                        }
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <TextInput key={`to-${resetKey}`} label={toUnit} value={toText} onChange={updateTo} />
              </section>
            </Cols>
            {error && (
              <div role="alert" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 'calc(10px * var(--tf))', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {error}
              </div>
            )}
            <Stack>
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                <button type="button" className="lc-btn secondary" onClick={commit}>
                  Convert
                </button>
                <button type="button" className="lc-btn secondary" onClick={swap}>
                  Swap units
                </button>
              </div>
            </Stack>
          </div>
        </form>
        <Divider />
        <section>
          <MonoLabel sm>Recent</MonoLabel>
          <Title size="md">Recent conversions</Title>
          {recent.length === 0 ? (
            <MonoLabel faint>No conversions yet. Type a value and press Enter.</MonoLabel>
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
                    {r.fromValue} {r.fromUnit} = {r.toValue} {r.toUnit} · {CATEGORIES[r.category]?.label ?? r.category}
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
