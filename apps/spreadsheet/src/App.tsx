// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  ErrorState,
  Keys,
  Kpi,
  KpiRow,
  Pills,
  PrimaryButton,
  Rail,
  Select,
  TextInput,
} from '@lacuna/ui'
import { parseCsv, toCsv } from '@lacuna/csv-parse'
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'
import { useUndoStack } from '@lacuna/use-undo-stack'
import {
  clearRangeCells,
  colToLetter,
  coordToKey,
  createTemplateWorkbook,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  deleteColAt,
  deleteRowAt,
  getActiveSheet,
  insertColAt,
  insertRowAt,
  isInRange,
  normalizeRange,
  patchRangeStyle,
  rangeLabel,
  setCellRaw,
  sortSheetByCol,
  TEMPLATES,
  updateActiveSheet,
  type CellAlign,
  type CellCoord,
  type CellRange,
  type NumberFormat,
  type TemplateId,
  type Workbook,
} from './model'
import {
  evaluateWorkbook,
  formatCellValue,
  SUPPORTED_FUNCTIONS,
  type CellValue,
} from './formula'
import { workbookStore } from './host'

const FORMAT_OPTIONS: { value: NumberFormat; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'percent', label: 'Percent (%)' },
  { value: 'integer', label: 'Integer' },
  { value: 'decimal', label: 'Decimal (0.00)' },
]

const ALIGN_ITEMS = ['Left', 'Center', 'Right']

export function App() {
  const initialWorkbook = useMemo(() => workbookStore.get(), [])
  const stack = useUndoStack<Workbook>(initialWorkbook, { limit: 60 })
  const workbook = stack.value
  const sheet = getActiveSheet(workbook)

  const [selection, setSelection] = useState<CellRange>({
    start: { row: 0, col: 0 },
    end: { row: 0, col: 0 },
  })
  const [editing, setEditing] = useState<boolean>(false)
  const [draft, setDraft] = useState<string>('')
  const [notice, setNotice] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [templateChoice, setTemplateChoice] = useState<TemplateId>('budget')
  const [renameText, setRenameText] = useState<string>(sheet.name)

  const cellInputRef = useRef<HTMLInputElement | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
  const jsonInputRef = useRef<HTMLInputElement | null>(null)
  const gridRef = useRef<HTMLTableElement | null>(null)

  // Persist workbook on every change
  useEffect(() => {
    workbookStore.set(workbook)
  }, [workbook])

  // Keep rename input synced with active sheet
  useEffect(() => {
    setRenameText(sheet.name)
  }, [sheet.id, sheet.name])

  // Clamp selection if sheet shrunk
  const activeCoord: CellCoord = {
    row: Math.min(selection.start.row, sheet.rows - 1),
    col: Math.min(selection.start.col, sheet.cols - 1),
  }
  const activeKey = coordToKey(activeCoord.row, activeCoord.col)
  const activeCell = sheet.cells[activeKey]

  const evaluated = useMemo(() => evaluateWorkbook(workbook), [workbook])
  const sheetValues = evaluated.get(sheet.id) ?? new Map<string, CellValue>()
  const activeVal: CellValue = sheetValues.get(activeKey) ?? { kind: 'empty' }

  // Sync formula bar when selection or underlying cell changes (if not actively editing inline)
  useEffect(() => {
    if (!editing) {
      setDraft(activeCell?.raw ?? '')
    }
  }, [activeKey, activeCell?.raw, editing, sheet.id])

  // Focus inline input when entering edit mode
  useEffect(() => {
    if (editing && cellInputRef.current) {
      cellInputRef.current.focus()
    }
  }, [editing, activeKey])

  // Selection statistics
  const stats = useMemo(() => {
    const { r1, r2, c1, c2 } = normalizeRange(selection)
    let count = 0
    let numCount = 0
    let sum = 0
    let min = Infinity
    let max = -Infinity
    for (let r = r1; r <= r2; r++) {
      for (let c = c1; c <= c2; c++) {
        const v = sheetValues.get(coordToKey(r, c))
        if (v && v.kind !== 'empty') {
          count++
          if (v.kind === 'number') {
            numCount++
            sum += v.value
            if (v.value < min) min = v.value
            if (v.value > max) max = v.value
          }
        }
      }
    }
    return {
      count,
      numCount,
      sum,
      avg: numCount > 0 ? sum / numCount : 0,
      min: numCount > 0 ? min : 0,
      max: numCount > 0 ? max : 0,
    }
  }, [selection, sheetValues])

  function commitEdit(nextRaw: string, move?: { dr: number; dc: number }) {
    const currentRaw = sheet.cells[activeKey]?.raw ?? ''
    if (nextRaw !== currentRaw) {
      stack.set((wb) => updateActiveSheet(wb, (s) => setCellRaw(s, activeKey, nextRaw)))
      setNotice(`Updated ${activeKey}`)
    }
    setEditing(false)
    if (move) {
      moveSelection(move.dr, move.dc, false)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(activeCell?.raw ?? '')
  }

  function moveSelection(dr: number, dc: number, extend: boolean) {
    const base = extend ? selection.end : activeCoord
    const nextRow = Math.max(0, Math.min(sheet.rows - 1, base.row + dr))
    const nextCol = Math.max(0, Math.min(sheet.cols - 1, base.col + dc))
    if (extend) {
      setSelection({ start: activeCoord, end: { row: nextRow, col: nextCol } })
    } else {
      setSelection({ start: { row: nextRow, col: nextCol }, end: { row: nextRow, col: nextCol } })
    }
  }

  function handleCellClick(row: number, col: number, shiftKey: boolean) {
    if (editing) {
      commitEdit(draft)
    }
    if (shiftKey) {
      setSelection((prev) => ({ start: prev.start, end: { row, col } }))
    } else {
      setSelection({ start: { row, col }, end: { row, col } })
    }
    setErrorMsg(null)
  }

  function handleCellDoubleClick(row: number, col: number) {
    const k = coordToKey(row, col)
    setSelection({ start: { row, col }, end: { row, col } })
    setDraft(sheet.cells[k]?.raw ?? '')
    setEditing(true)
  }

  function handleCellKeyDown(e: KeyboardEvent<HTMLTableCellElement>, row: number, col: number) {
    if (editing) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) stack.redo()
      else stack.undo()
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      stack.redo()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveSelection(1, 0, e.shiftKey)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveSelection(-1, 0, e.shiftKey)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      moveSelection(0, 1, e.shiftKey)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      moveSelection(0, -1, e.shiftKey)
    } else if (e.key === 'Tab') {
      e.preventDefault()
      moveSelection(0, e.shiftKey ? -1 : 1, false)
    } else if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault()
      setDraft(sheet.cells[coordToKey(row, col)]?.raw ?? '')
      setEditing(true)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      stack.set((wb) => updateActiveSheet(wb, (s) => clearRangeCells(s, selection)))
      setDraft('')
      setNotice(`Cleared ${rangeLabel(selection)}`)
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setDraft(e.key)
      setEditing(true)
    }
  }

  function handleInlineInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(draft, { dr: 1, dc: 0 })
    } else if (e.key === 'Tab') {
      e.preventDefault()
      commitEdit(draft, { dr: 0, dc: e.shiftKey ? -1 : 1 })
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  function handleFormulaBarKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(draft, { dr: 1, dc: 0 })
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  // Formatting actions
  function applyFormat(fmt: string) {
    stack.set((wb) =>
      updateActiveSheet(wb, (s) => patchRangeStyle(s, selection, { format: fmt as NumberFormat })),
    )
    setNotice(`Format set to ${fmt}`)
  }

  function toggleBold(checked: boolean) {
    stack.set((wb) => updateActiveSheet(wb, (s) => patchRangeStyle(s, selection, { bold: checked })))
    setNotice(checked ? 'Bold enabled' : 'Bold cleared')
  }

  function applyAlign(label: string) {
    const align = label.toLowerCase() as CellAlign
    stack.set((wb) => updateActiveSheet(wb, (s) => patchRangeStyle(s, selection, { align })))
    setNotice(`Aligned ${align}`)
  }

  // Row / column operations
  function handleInsertRow() {
    stack.set((wb) => updateActiveSheet(wb, (s) => insertRowAt(s, activeCoord.row)))
    setNotice(`Inserted row ${activeCoord.row + 1}`)
  }

  function handleDeleteRow() {
    stack.set((wb) => updateActiveSheet(wb, (s) => deleteRowAt(s, activeCoord.row)))
    setNotice(`Deleted row ${activeCoord.row + 1}`)
  }

  function handleInsertCol() {
    stack.set((wb) => updateActiveSheet(wb, (s) => insertColAt(s, activeCoord.col)))
    setNotice(`Inserted column ${colToLetter(activeCoord.col)}`)
  }

  function handleDeleteCol() {
    stack.set((wb) => updateActiveSheet(wb, (s) => deleteColAt(s, activeCoord.col)))
    setNotice(`Deleted column ${colToLetter(activeCoord.col)}`)
  }

  function handleSort(dir: 'asc' | 'desc') {
    stack.set((wb) =>
      updateActiveSheet(wb, (s) =>
        sortSheetByCol(s, activeCoord.col, dir, (r, c) => {
          const val = sheetValues.get(coordToKey(r, c))
          if (!val || val.kind === 'empty') return ''
          if (val.kind === 'number') return val.value
          if (val.kind === 'string') return val.value
          if (val.kind === 'boolean') return val.value ? 1 : 0
          return val.code
        }),
      ),
    )
    setNotice(`Sorted column ${colToLetter(activeCoord.col)} ${dir === 'asc' ? 'A-Z' : 'Z-A'}`)
  }

  // Multi-sheet operations
  function selectSheet(id: string) {
    if (editing) commitEdit(draft)
    stack.set((wb) => ({ ...wb, activeSheetId: id }))
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
  }

  function addSheet() {
    let n = workbook.sheets.length + 1
    while (workbook.sheets.some((s) => s.name.toLowerCase() === `sheet${n}`)) n++
    const id = `sheet-${Date.now()}-${n}`
    const name = `Sheet${n}`
    stack.set((wb) => ({
      ...wb,
      activeSheetId: id,
      sheets: [...wb.sheets, { id, name, rows: DEFAULT_ROWS, cols: DEFAULT_COLS, cells: {} }],
    }))
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
    setNotice(`Added ${name}`)
  }

  function renameSheet() {
    const trimmed = renameText.trim()
    if (!trimmed) {
      setErrorMsg('Sheet name cannot be empty.')
      return
    }
    if (workbook.sheets.some((s) => s.id !== sheet.id && s.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`A sheet named "${trimmed}" already exists.`)
      return
    }
    setErrorMsg(null)
    stack.set((wb) => updateActiveSheet(wb, (s) => ({ ...s, name: trimmed })))
    setNotice(`Renamed sheet to ${trimmed}`)
  }

  function deleteActiveSheet() {
    if (workbook.sheets.length <= 1) return
    const remaining = workbook.sheets.filter((s) => s.id !== sheet.id)
    stack.set((wb) => ({
      ...wb,
      activeSheetId: remaining[0].id,
      sheets: remaining,
    }))
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
    setNotice(`Deleted sheet ${sheet.name}`)
  }

  // Templates
  function loadTemplate() {
    const wb = createTemplateWorkbook(templateChoice)
    stack.set(wb)
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
    setEditing(false)
    setErrorMsg(null)
    setNotice(`Loaded ${wb.title}`)
  }

  // CSV / JSON Import & Export
  function handleExportCsv() {
    let maxR = 0
    let maxC = 0
    for (const [k, cell] of Object.entries(sheet.cells)) {
      if (!cell.raw.trim()) continue
      const match = /^([A-Z]+)(\d+)$/.exec(k)
      if (!match) continue
      const r = parseInt(match[2], 10) - 1
      let c = 0
      for (let i = 0; i < match[1].length; i++) c = c * 26 + (match[1].charCodeAt(i) - 64)
      c -= 1
      if (r > maxR) maxR = r
      if (c > maxC) maxC = c
    }
    const rows: string[][] = []
    for (let r = 0; r <= maxR; r++) {
      const row: string[] = []
      for (let c = 0; c <= maxC; c++) {
        const key = coordToKey(r, c)
        const val = sheetValues.get(key) ?? { kind: 'empty' }
        row.push(formatCellValue(val, sheet.cells[key]?.format))
      }
      rows.push(row)
    }
    const slug = sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'sheet'
    saveText(toCsv(rows), { filename: `${slug}.csv`, mimeType: 'text/csv;charset=utf-8' })
    setNotice(`Exported ${slug}.csv`)
  }

  function handleExportJson() {
    const slug = workbook.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workbook'
    saveJSON(workbook, { filename: `${slug}.json` })
    setNotice(`Exported ${slug}.json`)
  }

  async function handleImportCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = await openFile(file, 'text')
    if (!res.ok) {
      setErrorMsg(`Could not read CSV: ${res.error}`)
      return
    }
    const parsed = parseCsv(res.data as string)
    if (parsed.errors.length > 0) {
      setErrorMsg(`CSV parse error on line ${parsed.errors[0].line}: ${parsed.errors[0].message}`)
      return
    }
    const nextCells: Record<string, { raw: string; bold?: boolean }> = {}
    parsed.rows.forEach((row, r) => {
      row.forEach((val, c) => {
        if (val !== '') {
          nextCells[coordToKey(r, c)] = r === 0 ? { raw: val, bold: true } : { raw: val }
        }
      })
    })
    const rows = Math.max(DEFAULT_ROWS, parsed.rows.length + 4)
    const cols = Math.max(
      DEFAULT_COLS,
      parsed.rows.reduce((m, r) => Math.max(m, r.length), 0) + 2,
    )
    stack.set((wb) => updateActiveSheet(wb, (s) => ({ ...s, rows, cols, cells: nextCells })))
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
    setErrorMsg(null)
    setNotice(`Imported ${parsed.rows.length} rows from ${file.name}`)
  }

  async function handleImportJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = await openFile(file, 'json')
    if (!res.ok) {
      setErrorMsg(`Could not read JSON: ${res.error}`)
      return
    }
    const data = res.data as Partial<Workbook>
    if (!data || !Array.isArray(data.sheets) || data.sheets.length === 0) {
      setErrorMsg('JSON file is not a valid Spreadsheet workbook.')
      return
    }
    stack.set({
      title: typeof data.title === 'string' ? data.title : 'Imported Workbook',
      activeSheetId: typeof data.activeSheetId === 'string' ? data.activeSheetId : data.sheets[0].id,
      sheets: data.sheets,
    })
    setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } })
    setErrorMsg(null)
    setNotice(`Loaded workbook from ${file.name}`)
  }

  const filledCount = Object.values(sheet.cells).filter((c) => c.raw.trim() !== '').length
  const statusText = [
    notice,
    `${rangeLabel(selection)}`,
    stats.numCount > 0
      ? `Sum ${formatCellValue({ kind: 'number', value: stats.sum }, activeCell?.format)} · Avg ${formatCellValue({ kind: 'number', value: stats.avg }, activeCell?.format)} · Count ${stats.count}`
      : `Count ${stats.count}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const activeAlignLabel =
    activeCell?.align === 'center' ? 'Center' : activeCell?.align === 'right' ? 'Right' : 'Left'

  return (
    <AppShell
      name="Spreadsheet"
      icon="sheets"
      hue="green"
      category="Productivity"
      meta={`${workbook.sheets.length} ${workbook.sheets.length === 1 ? 'sheet' : 'sheets'} · ${filledCount} cells`}
      status={statusText}
      actions={
        <Actions>
          <Button kind="secondary" onClick={handleExportCsv}>Export CSV</Button>
          <Button kind="secondary" onClick={handleExportJson}>Export JSON</Button>
        </Actions>
      }
      side={
        <>
          <Rail title="Cell Inspector" note={activeKey}>
            <div className="ss-inspector-grid">
              <div className="ss-kv">
                <span className="ss-kv-label">Value</span>
                <span className="ss-kv-val">{formatCellValue(activeVal, activeCell?.format) || '—'}</span>
              </div>
              <div className="ss-kv">
                <span className="ss-kv-label">Type</span>
                <span className="ss-kv-val">{activeVal.kind}</span>
              </div>
              <Select
                label="Number format"
                value={activeCell?.format ?? 'auto'}
                onChange={applyFormat}
                options={FORMAT_OPTIONS}
              />
              <Checkbox
                label="Bold text"
                checked={Boolean(activeCell?.bold)}
                onChange={toggleBold}
              />
              <div>
                <div className="ss-kv-label">Alignment</div>
                <Pills items={ALIGN_ITEMS} active={activeAlignLabel} onSelect={applyAlign} />
              </div>
            </div>
          </Rail>

          <Rail title="Selection Summary">
            <KpiRow>
              <Kpi
                value={stats.numCount > 0 ? formatCellValue({ kind: 'number', value: stats.sum }, activeCell?.format) : '0'}
                label="Sum"
                accent
              />
              <Kpi
                value={stats.numCount > 0 ? formatCellValue({ kind: 'number', value: stats.avg }, activeCell?.format) : '0'}
                label="Average"
              />
            </KpiRow>
          </Rail>

          <Rail title="Workbook Template">
            <div className="ss-inspector-grid">
              <Select
                label="Template"
                value={templateChoice}
                onChange={(v) => setTemplateChoice(v as TemplateId)}
                options={TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              />
              <PrimaryButton onClick={loadTemplate}>Load template</PrimaryButton>
            </div>
          </Rail>

          <Rail title="Sheet Settings">
            <div className="ss-inspector-grid">
              <div className="ss-rename-row">
                <TextInput
                  label="Sheet name"
                  value={renameText}
                  onChange={setRenameText}
                />
                <Button kind="secondary" onClick={renameSheet}>Rename</Button>
              </div>
              {workbook.sheets.length > 1 && (
                <Button kind="danger" onClick={deleteActiveSheet}>Delete sheet</Button>
              )}
            </div>
          </Rail>

          <Rail title="Functions" note={`${SUPPORTED_FUNCTIONS.length} built-in`}>
            <div className="ss-fn-list">
              {SUPPORTED_FUNCTIONS.map((fn) => (
                <span key={fn} className="ss-fn-chip">{fn}</span>
              ))}
            </div>
          </Rail>

          <Rail title="Shortcuts">
            <Keys
              items={[
                ['Arrows', 'Move cell'],
                ['Shift+Arrows', 'Select range'],
                ['Enter / F2', 'Edit cell'],
                ['Esc', 'Cancel edit'],
                ['Del', 'Clear range'],
                ['Ctrl+Z', 'Undo'],
              ]}
            />
          </Rail>
        </>
      }
    >
      {errorMsg && <ErrorState title="Spreadsheet error" detail={errorMsg} />}

      <Card mono={workbook.title} title={sheet.name}>
        <div className="ss-toolbar" role="toolbar" aria-label="Sheet tools">
          <Button kind="secondary" onClick={() => stack.undo()} disabled={!stack.canUndo}>
            Undo
          </Button>
          <Button kind="secondary" onClick={() => stack.redo()} disabled={!stack.canRedo}>
            Redo
          </Button>
          <span className="ss-sep" aria-hidden />
          <Button kind="secondary" onClick={handleInsertRow}>Insert row</Button>
          <Button kind="secondary" onClick={handleDeleteRow} disabled={sheet.rows <= 1}>
            Delete row
          </Button>
          <Button kind="secondary" onClick={handleInsertCol}>Insert col</Button>
          <Button kind="secondary" onClick={handleDeleteCol} disabled={sheet.cols <= 1}>
            Delete col
          </Button>
          <span className="ss-sep" aria-hidden />
          <Button kind="secondary" onClick={() => handleSort('asc')}>Sort A-Z</Button>
          <Button kind="secondary" onClick={() => handleSort('desc')}>Sort Z-A</Button>
          <span className="ss-sep" aria-hidden />
          <Button kind="ghost" onClick={() => csvInputRef.current?.click()}>Import CSV</Button>
          <Button kind="ghost" onClick={() => jsonInputRef.current?.click()}>Import JSON</Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Import CSV file"
            className="ss-file-hidden"
            onChange={handleImportCsv}
          />
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Import JSON workbook"
            className="ss-file-hidden"
            onChange={handleImportJson}
          />
        </div>

        <div className="ss-formula-bar">
          <div className="ss-addr" aria-label="Selected cell">{rangeLabel(selection)}</div>
          <span className="ss-fx-badge" aria-hidden>fx</span>
          <input
            type="text"
            className="ss-formula-input"
            aria-label="Formula bar"
            placeholder="Enter value or formula (e.g. =SUM(B2:B7))"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleFormulaBarKeyDown}
          />
          <Button kind="primary" onClick={() => commitEdit(draft)}>Apply</Button>
        </div>

        <div className="ss-grid-wrap">
          <table
            ref={gridRef}
            className="ss-grid"
            role="grid"
            aria-label={`${sheet.name} spreadsheet grid`}
          >
            <thead>
              <tr>
                <th className="ss-corner" scope="col" aria-label="Row number" />
                {Array.from({ length: sheet.cols }, (_, c) => {
                  const isActiveCol = c === activeCoord.col
                  return (
                    <th
                      key={c}
                      scope="col"
                      className={`ss-col-head${isActiveCol ? ' active' : ''}`}
                    >
                      {colToLetter(c)}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: sheet.rows }, (_, r) => {
                const isActiveRow = r === activeCoord.row
                return (
                  <tr key={r}>
                    <th
                      scope="row"
                      className={`ss-row-head${isActiveRow ? ' active' : ''}`}
                    >
                      {r + 1}
                    </th>
                    {Array.from({ length: sheet.cols }, (_, c) => {
                      const key = coordToKey(r, c)
                      const cell = sheet.cells[key]
                      const val = sheetValues.get(key) ?? { kind: 'empty' }
                      const formatted = formatCellValue(val, cell?.format)
                      const isActive = r === activeCoord.row && c === activeCoord.col
                      const inSel = isInRange(r, c, selection)
                      const classes = [
                        'ss-cell',
                        isActive ? 'active' : '',
                        inSel && !isActive ? 'in-range' : '',
                        val.kind === 'number' ? 'num' : '',
                        val.kind === 'error' ? 'err' : '',
                        cell?.bold ? 'bold' : '',
                        cell?.align ? `align-${cell.align}` : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <td
                          key={key}
                          data-cell={key}
                          className={classes}
                          aria-selected={inSel}
                          tabIndex={isActive ? 0 : -1}
                          onClick={(e) => handleCellClick(r, c, e.shiftKey)}
                          onDoubleClick={() => handleCellDoubleClick(r, c)}
                          onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                        >
                          {isActive && editing ? (
                            <input
                              ref={cellInputRef}
                              type="text"
                              className="ss-cell-input"
                              aria-label={`Edit cell ${key}`}
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={handleInlineInputKeyDown}
                              onBlur={() => commitEdit(draft)}
                            />
                          ) : (
                            <span className="ss-cell-display">{formatted}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="ss-sheets-bar">
          <div className="ss-sheet-tabs" role="tablist" aria-label="Workbook sheets">
            {workbook.sheets.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === sheet.id}
                className="ss-sheet-tab"
                onClick={() => selectSheet(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <div className="ss-sheet-actions">
            <Button kind="secondary" onClick={addSheet}>Add sheet</Button>
          </div>
        </div>
      </Card>
    </AppShell>
  )
}
