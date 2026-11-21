import { useEffect, useState } from 'react'
import { Button, Card, Stack } from '@lacuna/ui'
import { CATEGORIES, convertValue, defaultUnits, formatValue, unitsFor, type Category } from './units'
import { host, type ConversionRecord } from './host'

export function App() {
  const [category, setCategory] = useState<Category>('Length')
  const [fromUnit, setFromUnit] = useState('Meters')
  const [toUnit, setToUnit] = useState('Feet')
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [recent, setRecent] = useState<ConversionRecord[]>([])

  useEffect(() => {
    let live = true
    host.listRecent().then((records) => {
      if (live) setRecent(records)
    })
    return () => {
      live = false
    }
  }, [])

  const units = unitsFor(category)

  function selectCategory(next: Category) {
    const [f, t] = defaultUnits(next)
    setCategory(next)
    setFromUnit(f)
    setToUnit(t)
    setFromText('')
    setToText('')
  }

  function selectFromUnit(next: string) {
    setFromUnit(next)
    setFromText('')
    setToText('')
  }

  function selectToUnit(next: string) {
    setToUnit(next)
    setFromText('')
    setToText('')
  }

  function onFromChange(next: string) {
    setFromText(next)
    const n = Number.parseFloat(next)
    if (next.trim() === '' || Number.isNaN(n)) {
      setToText('')
      return
    }
    setToText(formatValue(convertValue(category, fromUnit, toUnit, n)))
  }

  function onToChange(next: string) {
    setToText(next)
    const n = Number.parseFloat(next)
    if (next.trim() === '' || Number.isNaN(n)) {
      setFromText('')
      return
    }
    setFromText(formatValue(convertValue(category, toUnit, fromUnit, n)))
  }

  function swap() {
    const f = fromUnit
    const t = toUnit
    setFromUnit(t)
    setToUnit(f)
    const n = Number.parseFloat(fromText)
    if (fromText.trim() !== '' && !Number.isNaN(n)) {
      setFromText(formatValue(n))
      setToText(formatValue(convertValue(category, t, f, n)))
    } else {
      setFromText('')
      setToText('')
    }
  }

  function save() {
    const n = Number.parseFloat(fromText)
    const m = Number.parseFloat(toText)
    if (fromText.trim() === '' || toText.trim() === '' || Number.isNaN(n) || Number.isNaN(m)) return
    host
      .addRecent({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category,
        fromUnit,
        toUnit,
        fromValue: n,
        toValue: m,
      })
      .then(() => host.listRecent())
      .then(setRecent)
  }

  function restore(record: ConversionRecord) {
    const cat = record.category as Category
    setCategory(cat)
    setFromUnit(record.fromUnit)
    setToUnit(record.toUnit)
    setFromText(formatValue(record.fromValue))
    setToText(formatValue(record.toValue))
  }

  const fromInvalid = fromText.trim() !== '' && Number.isNaN(Number.parseFloat(fromText))

  return (
    <main className="app-main">
      <Stack lg>
        <Card title="Unit converter" mono="Units">
          <Stack>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => selectCategory(e.target.value as Category)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="field grow">
                <label htmlFor="from-unit">From unit</label>
                <select id="from-unit" value={fromUnit} onChange={(e) => selectFromUnit(e.target.value)}>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <Button kind="ghost" onClick={swap}>Swap</Button>
              <div className="field grow">
                <label htmlFor="to-unit">To unit</label>
                <select id="to-unit" value={toUnit} onChange={(e) => selectToUnit(e.target.value)}>
                  {units.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field grow">
                <label htmlFor="from-value">From value</label>
                <input id="from-value" value={fromText} onChange={(e) => onFromChange(e.target.value)} inputMode="decimal" placeholder="0" />
                {fromInvalid && <div className="error">Enter a number.</div>}
              </div>
              <div className="field grow">
                <label htmlFor="to-value">To value</label>
                <input id="to-value" value={toText} onChange={(e) => onToChange(e.target.value)} inputMode="decimal" placeholder="0" />
              </div>
            </div>
            <div>
              <Button kind="primary" onClick={save}>Save</Button>
            </div>
          </Stack>
        </Card>
        <Card title="Recent" mono="Recent conversions">
          {recent.length === 0 ? (
            <div>
              <div className="muted">No conversions yet. Type a value above.</div>
            </div>
          ) : (
            <ul aria-label="Recent">
              {recent.map((r) => (
                <li key={r.id}>
                  <button type="button" className="recent-item" onClick={() => restore(r)}>
                    {formatValue(r.fromValue)} {r.fromUnit} = {formatValue(r.toValue)} {r.toUnit}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </Stack>
    </main>
  )
}
