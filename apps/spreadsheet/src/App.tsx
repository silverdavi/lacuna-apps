import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, PrimaryButton } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { cellLabel, COL_NAMES, COLS, displayValue, exportCsv, isFormula, ROWS } from './engine'
import { host, type SheetData } from './host'

type Sheet = { name: string; cells: SheetData }

const DEFAULT_SHEETS: Sheet[] = [{ name: 'Sheet1', cells: {} }]

function loadInitial(): Sheet[] {
  const record = host.load()
  if (record && record.sheets.length > 0) return record.sheets
  return DEFAULT_SHEETS
}

function loadActiveIndex(): number {
  const record = host.load()
  if (record && record.active >= 0 && record.active < record.sheets.length) {
    return record.active
  }
  return 0
}

export function App() {
  const [sheets, setSheets] = useState<Sheet[]>(loadInitial)
  const [active, setActive] = useState(loadActiveIndex)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const draftRef = useRef('')
  const clipboard = useClipboard()

  const sheet = sheets[active] ?? DEFAULT_SHEETS[0]
  const cells = sheet.cells

  useEffect(() => {
    host.save({
      id: 'workbook',
      kind: 'workbook',
      sheets,
      active,
      updatedAt: 0,
    })
  }, [sheets, active])

  const editingKeyRef = useRef<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  function startEdit(key: string) {
    draftRef.current = cells[key] ?? ''
    editingKeyRef.current = key
    setDraft(draftRef.current)
    setEditing(key)
  }

  function commit(key: string, value: string) {
    draftRef.current = value
    editingKeyRef.current = null
    const trimmed = value.trim()
    setSheets((prev) =>
      prev.map((s, i) =>
        i === active ? { ...s, cells: { ...s.cells, [key]: trimmed } } : s,
      ),
    )
    setEditing(null)
    setDraft('')
  }

  function cancel() {
    draftRef.current = ''
    editingKeyRef.current = null
    setEditing(null)
    setDraft('')
  }

  function addSheet() {
    let n = sheets.length + 1
    while (sheets.some((s) => s.name === `Sheet${n}`)) n++
    const name = `Sheet${n}`
    setSheets((prev) => [...prev, { name, cells: {} }])
    setActive(sheets.length)
  }

  function doExport() {
    void clipboard.copy(exportCsv(sheet))
  }

  const activeName = sheet.name

  return (
    <AppShell name="Spreadsheet App" icon="sheets" hue="brown" category="Productivity" meta={`${sheets.length} ${sheets.length === 1 ? 'sheet' : 'sheets'}`}>
      <div
        style={{
          display: 'flex',
          gap: `calc(8px * var(--sf))`,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: `calc(12px * var(--sf))`,
        }}
      >
        <div className="lc-tabs" role="tablist" aria-label="Sheets" style={{ flex: 1, minWidth: 0 }}>
          {sheets.map((s, i) => (
            <button
              key={s.name}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`lc-tab${i === active ? ' active' : ''}`}
              style={i === active ? undefined : { color: 'var(--ink-60)' }}
              onClick={() => {
                setEditing(null)
                setDraft('')
                setActive(i)
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: `calc(8px * var(--sf))` }}>
          <Button kind="secondary" onClick={addSheet}>Add sheet</Button>
          <PrimaryButton onClick={doExport}>{clipboard.copied ? 'Copied' : 'Export CSV'}</PrimaryButton>
        </div>
      </div>

      <Card mono={activeName} title="Grid" flush>
        <table aria-label={`${activeName} grid`} style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 'calc(36px * var(--sf))' }} aria-label="Row numbers"></th>
              {COL_NAMES.map((c) => (
                <th
                  key={c}
                  aria-label={`Column ${c}`}
                  style={{
                    padding: `calc(6px * var(--sf))`,
                    borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    color: 'var(--ink-60)',
                    fontFamily: 'var(--mono)',
                    fontSize: `calc(10px * var(--tf))`,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    minWidth: `calc(80px * var(--sf))`,
                  }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }, (_, r) => (
              <tr key={r}>
                <th
                  scope="row"
                  aria-label={`Row ${r + 1}`}
                  style={{
                    padding: `calc(4px * var(--sf))`,
                    borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                    color: 'var(--ink-60)',
                    fontFamily: 'var(--mono)',
                    fontSize: `calc(10px * var(--tf))`,
                    textAlign: 'center',
                  }}
                >
                  {r + 1}
                </th>
                {COL_NAMES.map((c, col) => {
                  const key = `${col},${r}`
                  const label = cellLabel(col, r)
                  const raw = cells[key] ?? ''
                  const shown = displayValue(raw, cells)
                  const isActive = editing === key
                  return (
                    <td
                      key={label}
                      style={{
                        padding: 0,
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                        borderRight: 'calc(1px * var(--sf)) solid var(--ui-line)',
                        width: `calc(${Math.round(100 / (COLS + 1))}% )`,
                      }}
                    >
                      {isActive ? (
                        <input
                          ref={inputRef}
                          aria-label={label}
                          autoFocus
                          value={draft}
                          onChange={(e) => {
                            setDraft(e.target.value)
                            draftRef.current = e.target.value
                          }}
                          onBlur={() => {
                            if (editingKeyRef.current === key) commit(key, draftRef.current)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              commit(key, draftRef.current)
                            } else if (e.key === 'Escape') {
                              e.preventDefault()
                              cancel()
                            }
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            boxSizing: 'border-box',
                            border: 'none',
                            background: 'var(--paper)',
                            color: 'var(--ink)',
                            fontFamily: 'var(--sans)',
                            fontSize: `calc(13px * var(--tf))`,
                            padding: `calc(6px * var(--sf)) calc(8px * var(--sf))`,
                          }}
                          onFocus={(e) => {
                            e.currentTarget.select()
                          }}
                        />
                      ) : (
                        <button
                          type="button"
                          aria-label={label}
                          onClick={() => startEdit(key)}
                          style={{
                            display: 'block',
                            width: '100%',
                            border: 'none',
                            background: 'none',
                            cursor: 'text',
                            padding: `calc(6px * var(--sf)) calc(8px * var(--sf))`,
                            color: shown ? 'var(--ink)' : 'var(--ink-40)',
                            fontFamily: isFormula(raw) ? 'var(--mono)' : 'var(--sans)',
                            fontSize: `calc(13px * var(--tf))`,
                            textAlign: 'left',
                          }}
                        >
                          {shown}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  )
}
