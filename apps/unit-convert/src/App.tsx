import { useMemo, useState } from 'react'
import { Actions, Card, EmptyState, Kpi, KpiRow, PrimaryButton, Tabs, TextInput } from '@lacuna/ui'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  addRecent,
  convert,
  recordText,
  restoreRecord,
  swapUnits,
  type CategoryId,
  type RecentRecord,
} from './engine'
import { addRecent as hostAddRecent, clearRecent, listRecent as hostListRecent } from './host'

const CATEGORIES_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c] as const))

function recentFromHost(): RecentRecord[] {
  return hostListRecent().map((r) => ({
    id: r.id,
    category: r.category as CategoryId,
    fromUnit: r.fromUnit,
    toUnit: r.toUnit,
    fromValue: r.fromValue,
    toValue: r.toValue,
    at: r.at,
  }))
}

function saveToHost(record: RecentRecord): RecentRecord[] {
  hostAddRecent({
    category: record.category,
    fromUnit: record.fromUnit,
    toUnit: record.toUnit,
    fromValue: record.fromValue,
    toValue: record.toValue,
  })
  return recentFromHost()
}

export function App() {
  const [category, setCategory] = useState<CategoryId>('length')
  const [fromUnit, setFromUnit] = useState(CATEGORIES[0].defaults[0])
  const [toUnit, setToUnit] = useState(CATEGORIES[0].defaults[1])
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [recents, setRecents] = useState<RecentRecord[]>(recentFromHost)

  const live = useMemo(
    () => convert({ category, fromUnit, toUnit, value: fromText }),
    [category, fromUnit, toUnit, fromText],
  )

  function selectCategory(label: string) {
    const id = CATEGORIES.find((c) => c.label === label)?.id ?? 'length'
    if (id === category) return
    const next = CATEGORIES_BY_ID.get(id) ?? CATEGORIES[0]
    setCategory(id)
    setFromUnit(next.defaults[0])
    setToUnit(next.defaults[1])
    setFromText('')
    setToText('')
  }

  function onFromChange(value: string) {
    setFromText(value)
    const out = convert({ category, fromUnit, toUnit, value })
    setToText(out.ok ? out.toText : '')
  }

  function onToChange(value: string) {
    setToText(value)
    const out = convert({ category, fromUnit: toUnit, toUnit: fromUnit, value })
    setFromText(out.ok ? out.toText : '')
  }

  function doSwap() {
    const out = swapUnits({ category, fromUnit, toUnit, fromText, toText })
    setFromUnit(out.fromUnit)
    setToUnit(out.toUnit)
    setFromText(out.fromText)
    setToText(out.toText)
  }

  function saveConversion() {
    if (!live.ok) return
    const record: RecentRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      fromUnit,
      toUnit,
      fromValue: live.fromText,
      toValue: live.toText,
      at: Date.now(),
    }
    setRecents((prev) => {
      const next = addRecent(
        prev,
        { category, fromUnit, toUnit, fromValue: live.fromText, toValue: live.toText },
        record.id,
        record.at,
      )
      saveToHost(next[0])
      return next
    })
  }

  function onClearRecents() {
    clearRecent()
    setRecents([])
  }

  function restore(record: RecentRecord) {
    const out = restoreRecord({ record })
    setCategory(out.category)
    setFromUnit(out.fromUnit)
    setToUnit(out.toUnit)
    setFromText(out.fromText)
    setToText(out.toText)
  }

  const activeLabel = CATEGORIES_BY_ID.get(category)?.label ?? 'Length'

  return (
    <>
      <Card mono="Convert" title="Units">
        <Tabs items={CATEGORY_LABELS} active={activeLabel} onSelect={selectCategory} />
        <div className="uc-fieldrow">
          <TextInput label={fromUnit} value={fromText} onChange={onFromChange} />
          <TextInput label={toUnit} value={toText} onChange={onToChange} />
        </div>
        <Actions>
          <PrimaryButton onClick={saveConversion}>Save conversion</PrimaryButton>
          <button type="button" className="lc-btn secondary" onClick={doSwap}>
            Swap units
          </button>
        </Actions>
      </Card>

      <Card mono="Result" title="Converted">
        {live.ok ? (
          <KpiRow>
            <Kpi value={live.toText} label={`in ${toUnit}`} accent />
          </KpiRow>
        ) : fromText.trim() !== '' ? (
          <EmptyState mono="Input" title="Enter a number" detail="Type a value to convert it." />
        ) : (
          <EmptyState
            mono="Empty"
            title="No conversion yet"
            detail="Enter a value in either field to see the result."
          />
        )}
      </Card>

      <Card
        mono="Recent"
        title="Recents"
        actions={
          recents.length > 0 ? (
            <button type="button" className="lc-btn ghost" onClick={onClearRecents}>
              Clear
            </button>
          ) : undefined
        }
      >
        {recents.length === 0 ? (
          <EmptyState mono="Recent" title="No recents yet" detail="Save a conversion to see it here." />
        ) : (
          <ul className="uc-recent-list" aria-label="Recent">
            {recents.map((r) => (
              <li key={r.id}>
                <button type="button" className="lc-btn secondary uc-recent-item" onClick={() => restore(r)}>
                  {recordText(r)}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
