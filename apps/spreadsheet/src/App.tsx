import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  PrimaryButton,
  Rail,
  Row,
  Stack,
} from '@lacuna/ui'
import { parseCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  COL_NAMES,
  COLS,
  ROWS,
  cellLabel,
  displayValue,
  exportCsv,
  isFormula,
} from './engine'
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
  const [importText, setImportText] = useState('')
  const [importResult, setImportResult] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)
  const draftRef = useRef('')
  const editingKeyRef = useRef<string | null>(null)
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
    setEditing(null)
    setDraft('')
  }

  const onExport = async () => {
    try {
      await clipboard.copy(exportCsv(sheet))
      setExported('Copied the current sheet to the clipboard as CSV.')
      window.setTimeout(() => setExported(null), 2500)
    } catch {
      setExported('Could not reach the clipboard.')
    }
  }

  const onImport = () => {
    const text = importText.trim()
    if (!text) {
      setImportResult('Paste CSV first.')
      return
    }
    const { rows, errors } = parseCsv(text)
    if (errors.length > 0) {
      setImportResult(`CSV error: ${errors[0].message}`)
      return
    }
    const nextCells: SheetData = {}
    rows.slice(0, ROWS).forEach((row, r) => {
      row.slice(0, COLS).forEach((value, c) => {
        nextCells[`${c},${r}`] = value
      })
    })
    setSheets((prev) =>
      prev.map((s, i) => (i === active ? { ...s, cells: nextCells } : s)),
    )
    setImportResult(`Imported ${rows.length} rows into ${sheet.name}.`)
    setImportText('')
  }

  const onClear = () => {
    setSheets((prev) =>
      prev.map((s, i) => (i === active ? { ...s, cells: {} } : s)),
    )
    setEditing(null)
    setDraft('')
  }

  const filled = useMemo(
    () => Object.values(cells).filter((v) => v !== '').length,
    [cells],
  )

  const summary = useMemo(() => {
    const numeric = Object.values(cells)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n))
    const total = numeric.reduce((a, b) => a + b, 0)
    const formulaErrors = Object.values(cells).filter((v) => {
      if (!v.startsWith('=')) return false
      return displayValue(v, cells).startsWith('#')
    }).length
    return { total, filled, formulaErrors }
  }, [cells])

  const cellPad = `calc(6px * var(--sf)) calc(8px * var(--sf))`
  const cellFont = `calc(13px * var(--tf))`
  const lineColor = 'var(--ui-line)'

  return (
    <AppShell
      name="Spreadsheet App"
      icon="sheets"
      hue="brown"
      category="Productivity"
      meta={`${sheets.length} ${sheets.length === 1 ? 'sheet' : 'sheets'} · ${filled} cells`}
      status={clipboard.copied ? 'CSV copied' : undefined}
      side={
        <Rail
          title="Spreadsheet App"
          note={`${active + 1} of ${sheets.length} · local`}
          chips={['Formulas', 'Multi-sheet', 'CSV in/out']}
        >
          <MonoLabel faint>
            Type numbers or formulas like =A1*2 into the grid. Add sheets,
            switch between them, and move data to or from CSV.
          </MonoLabel>
        </Rail>
      }
    >
      <Card mono={sheet.name} title="Grid" flush>
        <table
          aria-label={`${sheet.name} grid`}
          style={{ borderCollapse: 'collapse', width: '100%' }}
        >
          <thead>
            <tr>
              <th
                style={{ width: 'calc(36px * var(--sf))' }}
                aria-label="Row numbers"
              ></th>
              {COL_NAMES.map((c) => (
                <th
                  key={c}
                  aria-label={`Column ${c}`}
                  style={{
                    padding: `calc(6px * var(--sf))`,
                    borderBottom: `calc(1px * var(--sf)) solid ${lineColor}`,
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
                    borderBottom: `calc(1px * var(--sf)) solid ${lineColor}`,
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
                        borderBottom: `calc(1px * var(--sf)) solid ${lineColor}`,
                        borderRight: `calc(1px * var(--sf)) solid ${lineColor}`,
                        width: `calc(${Math.round(100 / (COLS + 1))}%)`,
                      }}
                    >
                      {isActive ? (
                        <input
                          aria-label={label}
                          autoFocus
                          value={draft}
                          onChange={(e) => {
                            setDraft(e.target.value)
                            draftRef.current = e.target.value
                          }}
                          onBlur={() => {
                            if (editingKeyRef.current === key) {
                              commit(key, draftRef.current)
                            }
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
                            fontSize: cellFont,
                            padding: cellPad,
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
                            padding: cellPad,
                            color: shown ? 'var(--ink)' : 'var(--ink-40)',
                            fontFamily: isFormula(raw) ? 'var(--mono)' : 'var(--sans)',
                            fontSize: cellFont,
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

      <Card mono="Workbook" title="Sheets">
        <div
          style={{
            display: 'flex',
            gap: `calc(8px * var(--sf))`,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div
            className="lc-tabs"
            role="tablist"
            aria-label="Sheets"
            style={{ flex: 1, minWidth: 0 }}
          >
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
            <PrimaryButton onClick={onExport}>
              {clipboard.copied ? 'Copied' : 'Export CSV'}
            </PrimaryButton>
          </div>
        </div>
      </Card>

      <Card mono="Summary" title="This sheet">
        {filled === 0 ? (
          <EmptyState
            mono="Empty"
            title="No cells filled yet"
            detail="Type a number or a formula like =A1*2 into the grid and the summary updates as you go."
            actionLabel="Type into the grid"
          />
        ) : (
          <KpiRow>
            <Kpi label="Cells filled" value={String(summary.filled)} />
            <Kpi
              label="Numeric total"
              value={Number.isFinite(summary.total) ? summary.total.toFixed(2) : '—'}
            />
            <Kpi
              label="Formula errors"
              value={String(summary.formulaErrors)}
              accent={summary.formulaErrors > 0}
            />
          </KpiRow>
        )}
      </Card>

      <Card mono="Move data" title="CSV in and out">
        <Stack>
          <Body>
            Export copies the current sheet to the clipboard as CSV. Import
            replaces the current sheet from pasted CSV.
          </Body>
          {exported ? <p role="status">{exported}</p> : null}
          {importResult ? <p role="status">{importResult}</p> : null}
          <textarea
            aria-label="Paste CSV"
            rows={3}
            placeholder={'A,B\n10,20\n5,10'}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              border: `calc(1px * var(--sf)) solid ${lineColor}`,
              borderRadius: `calc(6px * var(--sf))`,
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontFamily: 'var(--mono)',
              fontSize: `calc(12px * var(--tf))`,
              padding: cellPad,
              resize: 'vertical',
            }}
          />
          <List label="Import">
            <Row
              title="Import"
              meta="replaces the current sheet"
              action={<Button kind="secondary" onClick={onImport}>Import</Button>}
            />
          </List>
          <Button kind="ghost" onClick={onClear} disabled={filled === 0}>
            Clear sheet
          </Button>
        </Stack>
      </Card>
    </AppShell>
  )
}
