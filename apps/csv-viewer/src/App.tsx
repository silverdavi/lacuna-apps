import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, KpiRow, Keys, Rail, Tabs, TextInput } from '@lacuna/ui'
import { parseCsv, toCsv } from '@lacuna/csv-parse'
import { openFile, saveText } from '@lacuna/file-save-open'
import { useCsvView } from './host/view'

interface Cell {
  row: number
  col: number
}

export function App() {
  const { value, set } = useCsvView()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Cell | null>(null)
  const [tab, setTab] = useState('Grid')
  const fileRef = useRef<HTMLInputElement>(null)

  const result = useMemo(() => (value.text ? parseCsv(value.text, { header: true }) : null), [value.text])
  const hasData = result !== null && result.rows.length > 0
  const headers = result?.header ?? []
  const total = result?.rows.length ?? 0
  const filter = value.filter

  const filtered = useMemo(() => {
    if (!result) return []
    const q = filter.trim().toLowerCase()
    if (!q) return result.rows
    return result.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)))
  }, [result, filter])

  const shown = filtered.length

  useEffect(() => {
    setSelected(null)
    setError(null)
  }, [value.text])

  async function applyFile(file: File) {
    const read = await openFile(file, 'text')
    if (!read.ok) {
      setError(`Could not open ${file.name}: ${read.error}`)
      return
    }
    set({ name: file.name, text: String(read.data), filter: '' })
    setTab('Grid')
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void applyFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void applyFile(file)
  }

  function clearFilter() {
    setError(null)
    set((view) => ({ ...view, filter: '' }))
  }

  function reset() {
    set({ name: '', text: '', filter: '' })
    setError(null)
    setTab('Grid')
  }

  function exportCsv() {
    if (!result) return
    const out = [result.header ?? [], ...filtered]
    saveText(toCsv(out), { filename: 'export.csv', mimeType: 'text/csv' })
  }

  function selectCell(row: number, col: number) {
    if (row < 0 || row >= filtered.length) return
    if (col < 0 || col >= headers.length) return
    setSelected({ row, col })
  }

  function onGridKey(e: React.KeyboardEvent) {
    if (!selected) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next = e.key === 'ArrowDown' ? selected.row + 1 : selected.row - 1
      selectCell((next + filtered.length) % filtered.length, selected.col)
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = e.key === 'ArrowRight' ? selected.col + 1 : selected.col - 1
      selectCell(selected.row, (next + headers.length) % headers.length)
    }
  }

  const railChips = hasData
    ? [`${shown} of ${shown} rows`, `${headers.length} cols`, value.name || 'CSV']
    : ['text/csv']

  const status = hasData
    ? filter.trim()
      ? `filtered ${shown}/${total}`
      : `${total} rows`
    : undefined

  return (
    <AppShell
      name="CSV Viewer"
      hue="blue"
      icon="sheets"
      category="Productivity"
      status={status}
      side={
        <Rail title="View" note={hasData ? value.name : undefined} chips={railChips}>
          {hasData ? (
            <>
              <KpiRow>
                <Kpi value={String(shown)} label="rows shown" accent={filter.trim() !== ''} />
                <Kpi value={String(headers.length)} label="columns" />
              </KpiRow>
              <Keys
                items={[
                  ['↑↓', 'Move row'],
                  ['←→', 'Move col'],
                ]}
              />
            </>
          ) : (
            <Keys items={[['F', 'Filter']]} />
          )}
        </Rail>
      }
      actions={
        hasData ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button kind="secondary" onClick={exportCsv}>Export CSV</Button>
            <Button kind="ghost" onClick={reset}>Reset</Button>
          </div>
        ) : undefined
      }
    >
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onPick} />

      {hasData ? (
        <Card mono="Data" title={value.name || 'CSV'}>
          <Tabs items={['Grid', 'Raw']} active={tab} onSelect={setTab} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 'calc(12px * var(--sf)) 0', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 calc(240px * var(--sf))', minWidth: 'calc(200px * var(--sf))' }}>
              <TextInput
                label="Filter"
                type="search"
                value={filter}
                placeholder="Filter rows by text"
                onChange={(v) => set((view) => ({ ...view, filter: v }))}
                error={error}
                hint={shown === 0 ? 'No rows match' : undefined}
              />
            </div>
            <Button kind="ghost" onClick={clearFilter} disabled={filter === ''}>Clear Filter</Button>
          </div>

          {tab === 'Grid' ? (
            <div tabIndex={0} onKeyDown={onGridKey} aria-label="CSV grid">
              <table className="lc-table" aria-label="CSV data">
                <thead>
                  <tr>
                    {headers.map((label, i) => (
                      <th key={i}>{label || `Column ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, ri) => (
                    <tr key={ri}>
                      {headers.map((_, ci) => {
                        const isSel = selected !== null && selected.row === ri && selected.col === ci
                        return (
                          <td
                            key={ci}
                            data-label={headers[ci] || `Column ${ci + 1}`}
                            aria-selected={isSel ? true : undefined}
                            style={isSel ? { background: 'var(--accent-soft)' } : undefined}
                            onClick={() => selectCell(ri, ci)}
                          >
                            {row[ci] ?? ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={headers.length} className="lc-faint" style={{ color: 'var(--ink-60)' }}>
                        {filter.trim() !== '' ? 'No rows match the filter' : 'No data'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <pre style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(12px * var(--tf))',
              background: 'var(--ui-bg)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(12px * var(--sf))',
              overflow: 'auto',
              maxHeight: 'calc(400px * var(--sf))',
              margin: 0,
            }}>{filtered.length === 0 ? (filter.trim() ? 'No rows match' : 'No data') : [headers, ...filtered].map((row) => row.join(',')).join('\n')}</pre>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            title="No CSV loaded"
            detail={error ?? undefined}
            mono="text/csv"
            actionLabel="Drop a CSV file or click to browse"
            onAction={() => fileRef.current?.click()}
          >
            <div
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: 'calc(1px * var(--sf)) dashed var(--ink-30)',
                borderRadius: 'calc(8px * var(--sf))',
                padding: 'calc(40px * var(--sf))',
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              <div style={{ color: 'var(--ink-60)' }}>Drag a CSV file here, or click to browse</div>
            </div>
          </EmptyState>
        </Card>
      )}
    </AppShell>
  )
}
