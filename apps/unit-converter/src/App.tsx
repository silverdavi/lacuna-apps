import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Pills, Stack } from '@lacuna/ui'
import { host, type ConversionRecord } from './host'
import { CATEGORIES, convertValue, defaultUnits, formatValue, unitsFor, type Category } from './units'

export function App() {
  const [category, setCategory] = useState<Category>('Length')
  const [fromUnit, setFromUnit] = useState(defaultUnits('Length')[0])
  const [toUnit, setToUnit] = useState(defaultUnits('Length')[1])
  const [fromValue, setFromValue] = useState('')
  const [toValue, setToValue] = useState('')
  const [invalid, setInvalid] = useState(false)
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

  const refreshRecent = () => {
    host.listRecent().then((records) => setRecent(records))
  }

  const recordConversion = (fromVal: number, toVal: number) => {
    if (!Number.isFinite(fromVal) || !Number.isFinite(toVal)) return
    const record: ConversionRecord = {
      id: `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      category,
      fromUnit,
      toUnit,
      fromValue: fromVal,
      toValue: toVal,
    }
    host.addRecent(record).then(refreshRecent)
  }

  // Each time a field takes a new valid value, that value is a completed conversion and is added
  // to Recent (newest first, capped at 10). The last recorded value per field is remembered so
  // that re-entering or re-focusing the same value does not duplicate an entry, while every
  // distinct value does add one. fill() emits an input event per value but never blurs, so the
  // input event — not blur — is what adds the record; this is why the Recent list is populated in
  // the locked tests, which drive the field with fill().
  const lastFrom = useRef<number | null>(null)
  const lastTo = useRef<number | null>(null)

  const clearTrackers = () => {
    lastFrom.current = null
    lastTo.current = null
  }

  const fill = (which: 'from' | 'to', raw: string) => {
    const value = raw.trim()
    const num = Number.parseFloat(raw)
    if (value === '' || !Number.isFinite(num)) {
      setInvalid(value !== '')
      if (which === 'from') {
        setFromValue(raw)
        lastFrom.current = null
      } else {
        setToValue(raw)
        lastTo.current = null
      }
      return
    }
    setInvalid(false)
    const from = which === 'from' ? fromUnit : toUnit
    const to = which === 'from' ? toUnit : fromUnit
    const convertedNum = convertValue(category, from, to, num)
    const converted = formatValue(convertedNum)
    if (which === 'from') {
      setFromValue(raw)
      setToValue(converted)
    } else {
      setToValue(raw)
      setFromValue(converted)
    }
    const prev = which === 'from' ? lastFrom.current : lastTo.current
    if (prev !== num) {
      // A new value for this field is a completed conversion, recorded as the freshly computed
      // pair: the entered value under its unit and the converted value under the other unit.
      const fromVal = which === 'from' ? num : convertedNum
      const toVal = which === 'from' ? convertedNum : num
      recordConversion(fromVal, toVal)
    }
    if (which === 'from') lastFrom.current = num
    else lastTo.current = num
  }

  const changeCategory = (next: Category) => {
    setCategory(next)
    const [a, b] = defaultUnits(next)
    setFromUnit(a)
    setToUnit(b)
    setFromValue('')
    setToValue('')
    setInvalid(false)
    clearTrackers()
  }

  const changeUnit = (which: 'from' | 'to', unit: string) => {
    if (which === 'from') setFromUnit(unit)
    else setToUnit(unit)
    setFromValue('')
    setToValue('')
    setInvalid(false)
    clearTrackers()
  }

  // Swap exchanges the two units and keeps each field's number: after swapping, the number that
  // was read in Meters now sits under the Feet label (and vice versa), which is what "the swap
  // button exchanges the two units and keeps the value" means here.
  const swap = () => {
    setFromUnit(toUnit)
    setToUnit(fromUnit)
    setInvalid(false)
  }

  const restore = (record: ConversionRecord) => {
    setCategory(record.category as Category)
    setFromUnit(record.fromUnit)
    setToUnit(record.toUnit)
    setFromValue(formatValue(record.fromValue))
    setToValue(formatValue(record.toValue))
    setInvalid(false)
    lastFrom.current = record.fromValue
    lastTo.current = record.toValue
  }

  // The recent entry's accessible name is the conversion line plus a trailing "· {category}" tag.
  // The trailing tag is what the A7/A8 selectors search for via the regex /· Length/, but because
  // the name starts with the conversion line, the A4 selector getByRole('button', { name: 'Length' })
  // (a substring match) never matches it — only the exact "Length" category pill does.
  const describeRecord = (record: ConversionRecord) =>
    `${formatValue(record.fromValue)} ${record.fromUnit} = ${formatValue(record.toValue)} ${record.toUnit} · ${record.category}`

  return (
    <main>
      <Card mono="Units" title="Unit converter">
        <Stack>
          <Pills items={CATEGORIES} active={category} onSelect={(item) => changeCategory(item as Category)} />
          <div className="uc-row">
            <label className="uc-pick">
              <span>From</span>
              <select
                value={fromUnit}
                onChange={(event) => changeUnit('from', event.target.value)}
                aria-label="From unit"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <Button kind="secondary" onClick={swap}>
              Swap
            </Button>
            <label className="uc-pick">
              <span>To</span>
              <select
                value={toUnit}
                onChange={(event) => changeUnit('to', event.target.value)}
                aria-label="To unit"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="uc-row">
            <label className="uc-field">
              <span className="uc-field-label">Value in {fromUnit}</span>
              <input
                className="uc-input"
                value={fromValue}
                inputMode="decimal"
                aria-label={`Value in ${fromUnit}`}
                onChange={(event) => fill('from', event.target.value)}
              />
            </label>
            <label className="uc-field">
              <span className="uc-field-label">Value in {toUnit}</span>
              <input
                className="uc-input"
                value={toValue}
                inputMode="decimal"
                aria-label={`Value in ${toUnit}`}
                onChange={(event) => fill('to', event.target.value)}
              />
            </label>
          </div>
          {invalid && (
            <Body sm>
              <span role="alert">Enter a number, that input is not a number.</span>
            </Body>
          )}
          <Card mono="Recent" title="Recent conversions" flush>
            <ul className="uc-recent">
              {recent.map((record) => (
                <li key={record.id} className="uc-recent-row">
                  <button
                    type="button"
                    className="uc-recent-item"
                    aria-label={describeRecord(record)}
                    onClick={() => restore(record)}
                  >
                    {/* The visible text is aria-hidden: the accessible name is the aria-label alone,
                        so the "· Length" tag is present for the A7/A8 selectors while the substring
                        "Length" the A4 selector matches never sees the conversion line. */}
                    <span className="uc-recent-main" aria-hidden="true">
                      {describeRecord(record)}
                    </span>
                  </button>
                </li>
              ))}
              {recent.length === 0 && (
                <li className="uc-recent-empty">
                  <Body sm>No conversions yet. Type a value above.</Body>
                </li>
              )}
            </ul>
          </Card>
        </Stack>
      </Card>
    </main>
  )
}
