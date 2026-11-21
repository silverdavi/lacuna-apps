import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Body,
  Breadcrumbs,
  Button,
  Card,
  Divider,
  EmptyState,
  Kpi,
  KpiRow,
  Mark,
  MonoLabel,
  Stack,
  TextInput,
} from '@lacuna/ui'
import {
  CATEGORIES,
  MAX_RECENT,
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

function BrandHomeLink() {
  return (
    <a href="/" className="lc-brand-home" aria-label="Lacuna">
      <Mark size={17} />
      <span className="lc-brandname">Lacuna</span>
    </a>
  )
}

export function App() {
  const [category, setCategory] = useState<CategoryId>('length')
  const [fromUnit, setFromUnit] = useState(CATEGORIES[0].defaults[0])
  const [toUnit, setToUnit] = useState(CATEGORIES[0].defaults[1])
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [recents, setRecents] = useState<RecentRecord[]>(recentFromHost)
  const [confirmClear, setConfirmClear] = useState(false)
  const [savedPulse, setSavedPulse] = useState(false)
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!confirmClear) return
    confirmTimer.current = setTimeout(() => setConfirmClear(false), 3000)
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [confirmClear])

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    },
    [],
  )

  const live = useMemo(
    () => convert({ category, fromUnit, toUnit, value: fromText }),
    [category, fromUnit, toUnit, fromText],
  )

  function flashSaved() {
    setSavedPulse(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedPulse(false), 1600)
  }

  function selectCategory(id: CategoryId) {
    if (id === category) return
    const next = CATEGORIES_BY_ID.get(id) ?? CATEGORIES[0]
    setCategory(id)
    setFromUnit(next.defaults[0])
    setToUnit(next.defaults[1])
    setFromText('')
    setToText('')
    setConfirmClear(false)
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
      const next = addRecent(prev, { category, fromUnit, toUnit, fromValue: live.fromText, toValue: live.toText }, record.id, record.at)
      saveToHost(next[0])
      return next
    })
    setConfirmClear(false)
    flashSaved()
  }

  function onClearRecents() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    clearRecent()
    setRecents([])
    setConfirmClear(false)
  }

  function restore(record: RecentRecord) {
    const out = restoreRecord({ record })
    setCategory(out.category)
    setFromUnit(out.fromUnit)
    setToUnit(out.toUnit)
    setFromText(out.fromText)
    setToText(out.toText)
    setConfirmClear(false)
  }

  const status = savedPulse ? 'Saved' : live.ok ? 'Live' : 'Ready'

  return (
    <div className="lc-shell uc-shell">
      <header className="lc-topbar uc-topbar">
        <div className="lc-topbar-brand">
          <BrandHomeLink />
          <Breadcrumbs items={[{ label: 'Shelf', to: '/' }, { label: 'Unit convert' }]} />
        </div>
        <div className="lc-topbar-right">
          <div className={`uc-status${savedPulse ? ' saved' : ''}`}>
            <MonoLabel sm>{status}</MonoLabel>
          </div>
        </div>
      </header>

      <div className="lc-shell-body">
        <main className="lc-shell-main">
          <div className="lc-page uc-page">
            <Card
              mono="Converter"
              title="Unit convert"
              actions={
                <div className="uc-cardcount">
                  <MonoLabel sm>
                    {recents.length}/{MAX_RECENT} recent
                  </MonoLabel>
                </div>
              }
            >
              <Stack>
                <Body>
                  Pick a category, type a value, and the opposite field updates live. Save to keep the
                  last ten in this browser.
                </Body>

                <div role="tablist" aria-label="Categories" className="uc-tabs">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="tab"
                      aria-selected={c.id === category}
                      className={`uc-tab${c.id === category ? ' on' : ''}`}
                      onClick={() => selectCategory(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="uc-fieldrow">
                  <TextInput label={fromUnit} value={fromText} onChange={onFromChange} />
                  <span className="uc-swap">
                    <Button kind="secondary" onClick={doSwap}>
                      Swap units
                    </Button>
                  </span>
                  <TextInput label={toUnit} value={toText} onChange={onToChange} />
                </div>

                {!live.ok && fromText.trim() !== '' && (
                  <div role="alert" className="uc-error">
                    <MonoLabel>{live.error || 'Enter a number'}</MonoLabel>
                  </div>
                )}

                <KpiRow>
                  <Kpi value={live.ok ? live.toText : '—'} label={`in ${toUnit}`} accent={live.ok} />
                  <Kpi value={live.fromText || '0'} label={`in ${fromUnit}`} />
                </KpiRow>

                <div className="uc-actions">
                  <span className="uc-save">
                    <Button kind="primary" onClick={saveConversion}>
                      Save conversion
                    </Button>
                  </span>
                  {savedPulse && (
                    <div className="uc-saved" role="status">
                      <MonoLabel sm>Saved to recents</MonoLabel>
                    </div>
                  )}
                </div>

                <Divider />

                <section aria-label="Recents" className="uc-recents">
                  <div className="uc-recents-head">
                    <MonoLabel>Recent</MonoLabel>
                    {recents.length > 0 && (
                      <span className="uc-clear">
                        <Button kind="ghost" onClick={onClearRecents}>
                          {confirmClear ? 'Confirm clear?' : 'Clear'}
                        </Button>
                      </span>
                    )}
                  </div>
                  {recents.length === 0 ? (
                    <EmptyState
                      mono="No recents yet"
                      title="Nothing saved yet"
                      detail="Convert and save a value to see it here."
                    />
                  ) : (
                    <ul className="uc-recent-list" aria-label="Recent">
                      {recents.map((r) => (
                        <li key={r.id}>
                          <button type="button" onClick={() => restore(r)} className="uc-recent-item">
                            <MonoLabel>{recordText(r)}</MonoLabel>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </Stack>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
