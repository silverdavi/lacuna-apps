import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { ELEMENTS, type Element } from './data'
import { addSearch, getPrefs, listSearches, setPrefs, type Search } from './host'

function filterElements(query: string, metalsOnly: boolean): Element[] {
  const q = query.trim().toLowerCase()
  return ELEMENTS.filter((el) => {
    if (metalsOnly && el.category !== 'Metal') return false
    if (!q) return true
    return el.name.toLowerCase().includes(q) || el.symbol.toLowerCase().includes(q)
  })
}

function formatWhen(at: number): string {
  try {
    return new Date(at).toLocaleDateString()
  } catch {
    return ''
  }
}

export function App() {
  const initial = getPrefs()
  const [query, setQuery] = useState('')
  const [metalsOnly, setMetalsOnly] = useState(initial.metalsOnly)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initial.selectedSymbol)
  const [history, setHistory] = useState<Search[]>(() => listSearches())
  const [copied, setCopied] = useState(false)
  const detailsRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => filterElements(query, metalsOnly), [query, metalsOnly])

  const selected = ELEMENTS.find((el) => el.symbol === selectedSymbol) ?? null
  const selectedValid = selected != null && (!metalsOnly || selected.category === 'Metal')

  useEffect(() => {
    if (selected && !selectedValid) {
      setSelectedSymbol(null)
      setPrefs({ selectedSymbol: null })
    }
  }, [selected, selectedValid])

  function select(el: Element) {
    setSelectedSymbol(el.symbol)
    setCopied(false)
    setPrefs({ selectedSymbol: el.symbol })
    addSearch({ symbol: el.symbol, name: el.name, at: Date.now() })
    setHistory(listSearches())
  }

  async function copyDetails() {
    if (!selected) return
    const text = `${selected.name} (${selected.symbol}) | ${selected.category} | ${selected.atomicMass}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const pool = metalsOnly ? ELEMENTS.filter((el) => el.category === 'Metal') : ELEMENTS
    if (pool.length === 0) return
    const idx = pool.findIndex((el) => el.symbol === selectedSymbol)
    let next: number
    if (idx === -1) {
      next = 0
    } else if (e.key === 'ArrowDown') {
      next = Math.min(idx + 1, pool.length - 1)
    } else {
      next = Math.max(idx - 1, 0)
    }
    if (pool[next]) select(pool[next])
  }

  return (
    <AppShell
      name="Periodic Table"
      icon="search"
      hue="brown"
      category="Productivity"
      meta={`${ELEMENTS.length} elements`}
      status={selectedValid && selected ? `${selected.name} · ${selected.category}` : 'No element selected'}
      side={
        <Rail
          title="Browse"
          note={`${ELEMENTS.length} elements · 3 categories`}
          chips={['Search', 'Filter', 'Copy', 'History']}
        />
      }
    >
      <Card mono="Search" title="Find an element">
        <FormGrid>
          <TextInput
            label="Search elements"
            value={query}
            onChange={setQuery}
            type="search"
            placeholder="Hydrogen or H"
          />
        </FormGrid>
        <Checkbox
          label="Show only metals"
          checked={metalsOnly}
          onChange={(v) => {
            setMetalsOnly(v)
            setPrefs({ metalsOnly: v })
          }}
        />
      </Card>

      <Card
        mono={results.length === 0 ? 'No matches' : `${results.length} match${results.length === 1 ? '' : 'es'}`}
        title="Results"
      >
        {results.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No elements match the current filter"
            detail="Try a different name or symbol, or switch the metal filter."
            actionLabel="Clear the search"
            onAction={() => {
              setQuery('')
              setMetalsOnly(false)
              setPrefs({ metalsOnly: false })
            }}
          />
        ) : (
          <List label="Search results">
            {results.map((el) => (
              <Row
                key={el.symbol}
                title={`${el.name} (${el.symbol})`}
                meta={el.category}
                hot={selectedSymbol === el.symbol}
                onClick={() => select(el)}
              />
            ))}
          </List>
        )}
      </Card>

      <Card
        mono={selectedValid && selected ? `No. ${selected.atomicNumber}` : 'None'}
        title="Details"
        actions={
          <Button kind="secondary" onClick={copyDetails} disabled={!selectedValid || !selected} ariaLabel="Copy details">
            {copied ? 'Copied' : 'Copy details'}
          </Button>
        }
      >
        <div ref={detailsRef} onKeyDown={handleKeyDown} tabIndex={0}>
          {selectedValid && selected ? (
            <KpiRow>
              <Kpi value={selected.symbol} label="Symbol" accent />
              <Kpi value={String(selected.atomicNumber)} label="Number" />
              <Kpi value={selected.atomicMass} label="Mass" />
            </KpiRow>
          ) : null}
          <Table
            label="Element details"
            columns={[
              { key: 'symbol', label: 'Symbol' },
              { key: 'name', label: 'Name' },
              { key: 'category', label: 'Category' },
            ]}
            rows={
              selectedValid && selected
                ? [
                    {
                      cells: {
                        symbol: selected.symbol,
                        name: selected.name,
                        category: <Tag accent>{selected.category}</Tag>,
                      },
                      hot: true,
                    },
                  ]
                : []
            }
            empty={
              <EmptyState
                mono="Empty"
                title="No element selected"
                detail="Search above and pick an element, or use the arrow keys to browse."
                actionLabel="Search an element"
              />
            }
          />
        </div>
      </Card>

      <Card mono={`${history.length} recent`} title="Recent">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No recent searches"
            detail="Elements you open will appear here."
            actionLabel="Search an element"
          />
        ) : (
          <List label="Recent searches">
            {history.map((s) => (
              <Row
                key={s.id}
                title={`${s.name} (${s.symbol})`}
                meta={formatWhen(s.at)}
                hot={selectedSymbol === s.symbol}
                onClick={() => {
                  const el = ELEMENTS.find((e) => e.symbol === s.symbol)
                  if (el) select(el)
                }}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
