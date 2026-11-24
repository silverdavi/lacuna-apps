// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Button, Card, Checkbox, EmptyState, FormGrid, Kpi, KpiRow, Rail, TextInput } from '@lacuna/ui'
import { ELEMENTS, type Element } from './data'
import { addSearch, getPrefs, listSearches, setPrefs } from './host'

function filterElements(search: string, metalsOnly: boolean): Element[] {
  const q = search.trim().toLowerCase()
  return ELEMENTS.filter((el) => {
    if (metalsOnly && el.category !== 'Metal') return false
    if (!q) return true
    return el.name.toLowerCase().includes(q) || el.symbol.toLowerCase() === q
  })
}

const COLS = 'calc(56px * var(--sf)) 1fr 1fr calc(72px * var(--sf))'
const cellStyle: React.CSSProperties = { padding: 'calc(8px * var(--sf))' }
const headStyle: React.CSSProperties = { ...cellStyle, fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--sf))', textTransform: 'uppercase', color: 'var(--ink-60)' }
const rowStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: COLS, borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)', cursor: 'pointer' }

export function App() {
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [metalsOnly, setMetalsOnly] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const p = getPrefs()
    setSelectedSymbol(p.selectedSymbol)
    setMetalsOnly(p.metalsOnly)
  }, [])

  const filtered = useMemo(() => filterElements(search, metalsOnly), [search, metalsOnly])
  const resultRow = useMemo(
    () => {
      if (!selectedSymbol) return null
      const el = ELEMENTS.find((e) => e.symbol === selectedSymbol)
      if (!el) return null
      if (metalsOnly && el.category !== 'Metal') return null
      if (search) {
        const q = search.trim().toLowerCase()
        if (q && !el.name.toLowerCase().includes(q) && el.symbol.toLowerCase() !== q) return null
      }
      return el
    },
    [selectedSymbol, metalsOnly, search],
  )
  const history = useMemo(
    () => listSearches().map((s) => ELEMENTS.find((el) => el.symbol === s.symbol)).filter((el): el is Element => el !== null).slice(0, 6),
    [],
  )

  function select(el: Element) {
    setSelectedSymbol(el.symbol)
    setPrefs({ selectedSymbol: el.symbol })
    addSearch({ symbol: el.symbol, name: el.name, at: Date.now() })
    if (search && !filterElements(search, metalsOnly).some((f) => f.symbol === el.symbol)) setSearch('')
  }

  async function copyDetails() {
    if (!resultRow) return
    try {
      await navigator.clipboard.writeText(`${resultRow.name} (${resultRow.symbol}) | ${resultRow.category} | ${resultRow.atomicMass}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return
    const active = document.activeElement as HTMLElement | null
    const row = active?.closest('[data-symbol]') as HTMLElement | null
    const cur = row ? row.getAttribute('data-symbol') ?? undefined : undefined
    if (e.key === 'Enter') {
      if (cur) {
        const el = ELEMENTS.find((x) => x.symbol === cur)
        if (el) select(el)
      }
      return
    }
    e.preventDefault()
    const curIdx = cur ? ELEMENTS.findIndex((el) => el.symbol === cur) : -1
    const next = e.key === 'ArrowDown' ? ELEMENTS[curIdx + 1] : ELEMENTS[curIdx - 1]
    if (!next) return
    select(next)
    requestAnimationFrame(() => {
      document.querySelector(`[data-symbol="${next.symbol}"]`)?.focus()
    })
  }

  return (
    <AppShell
      name="Periodic Table"
      icon="search"
      hue="brown"
      category="Productivity"
      meta={`${filtered.length} of ${ELEMENTS.length} shown`}
      status={resultRow ? `${resultRow.name} (${resultRow.symbol}) · ${resultRow.category}` : 'No element selected'}
      side={
        <Rail
          title="Elements"
          note={`${filtered.length} matching`}
          chips={['Search by name or symbol', 'Arrow keys move rows', 'Enter selects a row', 'Filter to metals only']}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'calc(300px * var(--sf)) 1fr', gap: 'calc(16px * var(--sf))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
          <Card mono="Search" title="Elements">
            <FormGrid>
              <TextInput label="Search elements" placeholder="Hydrogen or H" value={search} onChange={setSearch} />
              <Checkbox label="Show only metals" checked={metalsOnly} onChange={(v) => { setMetalsOnly(v); setPrefs({ metalsOnly: v }) }} />
            </FormGrid>
            <div style={{ marginTop: 'calc(12px * var(--sf))', display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
              {filtered.length === 0
                ? <EmptyState mono="No results" title="No matches" detail="Try a different name or symbol." actionLabel="Clear search" onAction={() => setSearch('')} />
                : filtered.map((el) => (
                  <Button key={el.symbol} kind="secondary" onClick={() => select(el)} ariaLabel={`${el.name} (${el.symbol}), ${el.category}`} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', textAlign: 'left', gap: 'calc(8px * var(--sf))' }}>
                    <span>{`${el.name} (${el.symbol})`}</span>
                    <span style={{ color: 'var(--ink-60)', fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))' }}>{el.category}</span>
                  </Button>
                ))}
            </div>
          </Card>

          <Card mono="Details" title={resultRow ? resultRow.name : 'No element selected'}>
            {resultRow ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(8px * var(--sf))', marginBottom: 'calc(8px * var(--sf))' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(18px * var(--tf))', color: 'var(--ink)' }}>{resultRow.symbol}</span>
                  <span style={{ fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' }}>{resultRow.name}</span>
                  <span style={{ color: 'var(--ink-60)', fontSize: 'calc(12px * var(--tf))' }}>{resultRow.category}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)' }}>{resultRow.atomicMass}</span>
                </div>
                <KpiRow>
                  <Kpi value={`#${resultRow.atomicNumber}`} label="Atomic number" />
                  <Kpi value={resultRow.category} label="Category" />
                </KpiRow>
                <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                  <Button kind="primary" onClick={copyDetails}>{copied ? 'Copied' : 'Copy details'}</Button>
                </div>
              </>
            ) : (
              <EmptyState mono="Details" title="No element selected" detail="Search and choose an element to see its details." actionLabel="Pick an element" />
            )}
          </Card>

          <Card mono="History" title="Recent">
            {history.length === 0
              ? <EmptyState mono="History" title="Nothing yet" detail="Elements you open land here." actionLabel="Open an element" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
                  {history.map((el) => (
                    <Button key={el.symbol} kind="ghost" onClick={() => select(el)} ariaLabel={`Open ${el.name} (${el.symbol})`} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'baseline', textAlign: 'left', gap: 'calc(8px * var(--sf))' }}>
                      <span>{`${el.name} (${el.symbol})`}</span>
                      <span style={{ color: 'var(--ink-60)', fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))' }}>{el.atomicMass}</span>
                    </Button>
                  ))}
                </div>
              )}
          </Card>
        </div>

        <Card mono="Result" title="Elements" accent={resultRow !== null}>
          <div aria-label="Elements" onKeyDown={onKeyDown}>
            <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
              <div role="columnheader" style={headStyle}>Symbol</div>
              <div role="columnheader" style={headStyle}>Name</div>
              <div role="columnheader" style={headStyle}>Category</div>
              <div role="columnheader" style={headStyle}>Mass</div>
            </div>
            {resultRow ? (
              <div
                role="gridrow"
                data-symbol={resultRow.symbol}
                tabIndex={0}
                onClick={() => select(resultRow)}
                style={{ ...rowStyle, background: 'var(--accent-soft)' }}
              >
                <div role="cell" aria-label={resultRow.symbol} style={{ ...cellStyle, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>{resultRow.symbol}</div>
                <div role="cell" aria-label={resultRow.name} style={{ ...cellStyle, fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>{resultRow.name}</div>
                <div role="cell" style={{ ...cellStyle, fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-80)' }}>{resultRow.category}</div>
                <div role="cell" style={{ ...cellStyle, fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', textAlign: 'right', color: 'var(--ink-80)' }}>{resultRow.atomicMass}</div>
              </div>
            ) : (
              <div style={{ padding: 'calc(12px * var(--sf))' }}>
                <EmptyState
                  mono="Filter"
                  title="No elements match the current filter"
                  detail="Adjust the search or uncheck the metals filter."
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
