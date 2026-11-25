import { useEffect, useMemo, useState } from 'react'
import { AppShell, Card, Checkbox, EmptyState, FormGrid, Kpi, KpiRow, PrimaryButton, Rail, Table, TextInput } from '@lacuna/ui'
import { ELEMENTS, type Element } from './data'
import { getPrefs, setPrefs } from './host'

function matchElements(query: string, metalsOnly: boolean): Element[] {
  const q = query.trim().toLowerCase()
  return ELEMENTS.filter((el) => {
    if (metalsOnly && el.category !== 'Metal') return false
    if (!q) return true
    return el.name.toLowerCase().includes(q) || el.symbol.toLowerCase() === q
  })
}

export function App() {
  const initial = getPrefs()
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initial.selectedSymbol)
  const [metalsOnly, setMetalsOnly] = useState(initial.metalsOnly)
  const [copied, setCopied] = useState(false)

  const selected = useMemo(() => ELEMENTS.find((el) => el.symbol === selectedSymbol) ?? null, [selectedSymbol])
  const rows = useMemo(() => {
    if (metalsOnly) {
      const list = ELEMENTS.filter((el) => el.category === 'Metal')
      return selected && selected.category === 'Metal'
        ? list.some((el) => el.symbol === selected.symbol) ? list : [selected, ...list]
        : list
    }
    const list = matchElements(search, false)
    if (!selected) return list
    if (list.some((el) => el.symbol === selected.symbol)) return list
    return [selected, ...list.filter((el) => el.symbol !== selected.symbol)]
  }, [search, metalsOnly, selected])

  function select(el: Element) {
    setSelectedSymbol(el.symbol)
    setPrefs({ selectedSymbol: el.symbol })
  }

  function move(dir: 1 | -1) {
    if (!selected) return
    const idx = ELEMENTS.findIndex((el) => el.symbol === selected.symbol)
    const next = ELEMENTS[idx + dir]
    if (next) select(next)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION' || target?.isContentEditable) return
      e.preventDefault()
      move(e.key === 'ArrowDown' ? 1 : -1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  async function copyDetails() {
    if (!selected) return
    try {
      await navigator.clipboard.writeText(`${selected.name} (${selected.symbol}) | ${selected.category} | ${selected.atomicMass}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <AppShell
      name="Periodic Table"
      icon="search"
      hue="brown"
      category="Productivity"
      meta={`${rows.length} of ${ELEMENTS.length} shown`}
      status={selected ? `${selected.name} (${selected.symbol})` : 'No element selected'}
      side={
        <Rail
          title="Elements"
          note={`${rows.length} in the grid`}
          chips={['Search by name or symbol', 'Arrow keys step rows', 'Filter to metals only', 'Copy details to clipboard']}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'calc(300px * var(--sf)) 1fr', gap: 'calc(16px * var(--sf))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
          <Card mono="Search" title="Find an element">
            <FormGrid>
              <TextInput label="Search elements" placeholder="Iron or Fe" value={search} onChange={setSearch} />
              <Checkbox label="Show only metals" checked={metalsOnly} onChange={(v) => { setMetalsOnly(v); setPrefs({ metalsOnly: v }) }} />
            </FormGrid>
            <div style={{ marginTop: 'calc(12px * var(--sf))' }} role="listbox" aria-label="Results">
              {rows.length === 0
                ? <EmptyState mono="No results" title="No matches" detail="Try a different name or symbol." actionLabel="Clear the search" onAction={() => setSearch('')} />
                : rows.map((el) => (
                  <button
                    key={el.symbol}
                    type="button"
                    role="option"
                    aria-selected={selected?.symbol === el.symbol}
                    tabIndex={0}
                    onClick={() => select(el)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 'calc(8px * var(--sf))',
                      textAlign: 'left',
                      padding: 'calc(8px * var(--sf))',
                       border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                       borderRadius: 'calc(2px * var(--sf))',
                      background: 'var(--ui-card)',
                      fontFamily: 'var(--sans)',
                      fontSize: 'calc(13px * var(--tf))',
                      color: 'var(--ink)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>{`${el.name} (${el.symbol})`}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>{el.category}</span>
                  </button>
                ))}
            </div>
          </Card>

          <Card mono="Details" title={selected ? selected.name : 'No element selected'}>
            {selected ? (
              <>
                <KpiRow>
                  <Kpi value={selected.symbol} label="Symbol" accent />
                  <Kpi value={`#${selected.atomicNumber}`} label="Atomic number" />
                </KpiRow>
                <div style={{ marginTop: 'calc(8px * var(--sf))', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>{selected.name}</div>
                <div style={{ marginTop: 'calc(4px * var(--sf))', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                  {selected.category} · mass {selected.atomicMass}
                </div>
                <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
                  <PrimaryButton onClick={copyDetails}>{copied ? 'Copied' : 'Copy details'}</PrimaryButton>
                </div>
              </>
            ) : (
              <EmptyState mono="Details" title="No element selected" detail="Search and choose an element to see its details." actionLabel="Pick an element" />
            )}
          </Card>
        </div>

        <Card mono="Result" title="Elements" accent={selected !== null}>
          <Table
              label="Elements"
              columns={[
                { key: 'symbol', label: 'Symbol', num: true },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'mass', label: 'Atomic mass', num: true },
              ]}
              rows={rows.map((el) => ({
                hot: el.symbol === selected?.symbol,
                cells: {
                  symbol: el.symbol,
                  name: el.name,
                  category: el.category,
                  mass: el.atomicMass,
                },
              }))}
              empty={<EmptyState mono="Filter" title="No elements match the current filter" detail="Adjust the search or uncheck the metals filter." actionLabel="Adjust the filter" />}
          />
        </Card>
      </div>
    </AppShell>
  )
}
