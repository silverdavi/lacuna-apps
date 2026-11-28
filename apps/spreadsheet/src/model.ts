// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
export type NumberFormat = 'auto' | 'currency' | 'percent' | 'integer' | 'decimal'
export type CellAlign = 'left' | 'center' | 'right'

export interface CellData {
  raw: string
  format?: NumberFormat
  bold?: boolean
  align?: CellAlign
}

export interface SheetData {
  id: string
  name: string
  rows: number
  cols: number
  cells: Record<string, CellData>
}

export interface Workbook {
  title: string
  activeSheetId: string
  sheets: SheetData[]
}

export interface CellCoord {
  row: number // 0-based
  col: number // 0-based
}

export interface CellRange {
  start: CellCoord
  end: CellCoord
}

export const DEFAULT_ROWS = 24
export const DEFAULT_COLS = 10

export function colToLetter(col: number): string {
  let n = col + 1
  let out = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    out = String.fromCharCode(65 + rem) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

export function letterToCol(letters: string): number {
  let col = 0
  const up = letters.toUpperCase()
  for (let i = 0; i < up.length; i++) {
    col = col * 26 + (up.charCodeAt(i) - 64)
  }
  return col - 1
}

export function coordToKey(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`
}

export function parseCellKey(key: string): CellCoord | null {
  const m = /^\$?([A-Za-z]+)\$?(\d+)$/.exec(key.trim())
  if (!m) return null
  const col = letterToCol(m[1])
  const row = parseInt(m[2], 10) - 1
  if (row < 0 || col < 0) return null
  return { row, col }
}

export function normalizeRange(range: CellRange): {
  r1: number
  r2: number
  c1: number
  c2: number
} {
  return {
    r1: Math.min(range.start.row, range.end.row),
    r2: Math.max(range.start.row, range.end.row),
    c1: Math.min(range.start.col, range.end.col),
    c2: Math.max(range.start.col, range.end.col),
  }
}

export function isInRange(row: number, col: number, range: CellRange): boolean {
  const { r1, r2, c1, c2 } = normalizeRange(range)
  return row >= r1 && row <= r2 && col >= c1 && col <= c2
}

export function rangeLabel(range: CellRange): string {
  const { r1, r2, c1, c2 } = normalizeRange(range)
  const a = coordToKey(r1, c1)
  const b = coordToKey(r2, c2)
  return a === b ? a : `${a}:${b}`
}

export function getActiveSheet(wb: Workbook): SheetData {
  return wb.sheets.find((s) => s.id === wb.activeSheetId) ?? wb.sheets[0]
}

export function updateActiveSheet(
  wb: Workbook,
  updater: (sheet: SheetData) => SheetData,
): Workbook {
  const active = getActiveSheet(wb)
  return {
    ...wb,
    sheets: wb.sheets.map((s) => (s.id === active.id ? updater(s) : s)),
  }
}

export function setCellRaw(sheet: SheetData, key: string, raw: string): SheetData {
  const existing = sheet.cells[key]
  const trimmed = raw
  if (!trimmed && (!existing || (!existing.bold && !existing.format && !existing.align))) {
    if (!(key in sheet.cells)) return sheet
    const next = { ...sheet.cells }
    delete next[key]
    return { ...sheet, cells: next }
  }
  return {
    ...sheet,
    cells: {
      ...sheet.cells,
      [key]: { ...(existing ?? { raw: '' }), raw: trimmed },
    },
  }
}

export function patchRangeStyle(
  sheet: SheetData,
  range: CellRange,
  patch: Partial<Pick<CellData, 'format' | 'bold' | 'align'>>,
): SheetData {
  const { r1, r2, c1, c2 } = normalizeRange(range)
  const cells = { ...sheet.cells }
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const k = coordToKey(r, c)
      const prev = cells[k] ?? { raw: '' }
      cells[k] = { ...prev, ...patch }
    }
  }
  return { ...sheet, cells }
}

export function clearRangeCells(sheet: SheetData, range: CellRange): SheetData {
  const { r1, r2, c1, c2 } = normalizeRange(range)
  const cells = { ...sheet.cells }
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      delete cells[coordToKey(r, c)]
    }
  }
  return { ...sheet, cells }
}

export function insertRowAt(sheet: SheetData, atRow: number): SheetData {
  const next: Record<string, CellData> = {}
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const coord = parseCellKey(key)
    if (!coord) continue
    const newRow = coord.row >= atRow ? coord.row + 1 : coord.row
    next[coordToKey(newRow, coord.col)] = cell
  }
  return { ...sheet, rows: sheet.rows + 1, cells: next }
}

export function deleteRowAt(sheet: SheetData, atRow: number): SheetData {
  if (sheet.rows <= 1) return sheet
  const next: Record<string, CellData> = {}
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const coord = parseCellKey(key)
    if (!coord || coord.row === atRow) continue
    const newRow = coord.row > atRow ? coord.row - 1 : coord.row
    next[coordToKey(newRow, coord.col)] = cell
  }
  return { ...sheet, rows: sheet.rows - 1, cells: next }
}

export function insertColAt(sheet: SheetData, atCol: number): SheetData {
  const next: Record<string, CellData> = {}
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const coord = parseCellKey(key)
    if (!coord) continue
    const newCol = coord.col >= atCol ? coord.col + 1 : coord.col
    next[coordToKey(coord.row, newCol)] = cell
  }
  return { ...sheet, cols: sheet.cols + 1, cells: next }
}

export function deleteColAt(sheet: SheetData, atCol: number): SheetData {
  if (sheet.cols <= 1) return sheet
  const next: Record<string, CellData> = {}
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const coord = parseCellKey(key)
    if (!coord || coord.col === atCol) continue
    const newCol = coord.col > atCol ? coord.col - 1 : coord.col
    next[coordToKey(coord.row, newCol)] = cell
  }
  return { ...sheet, cols: sheet.cols - 1, cells: next }
}

export function sortSheetByCol(
  sheet: SheetData,
  col: number,
  direction: 'asc' | 'desc',
  getSortValue: (row: number, col: number) => string | number,
): SheetData {
  // Keep row 0 as header if it contains non-empty text; sort rows 1..lastNonEmpty
  let lastRow = 0
  for (const key of Object.keys(sheet.cells)) {
    const c = parseCellKey(key)
    if (c && c.row > lastRow && sheet.cells[key].raw.trim() !== '') {
      lastRow = c.row
    }
  }
  if (lastRow <= 1) return sheet

  const dataRows: number[] = []
  for (let r = 1; r <= lastRow; r++) {
    let hasContent = false
    for (let c = 0; c < sheet.cols; c++) {
      if (sheet.cells[coordToKey(r, c)]?.raw.trim()) {
        hasContent = true
        break
      }
    }
    if (hasContent) dataRows.push(r)
  }

  // Exclude summary row if the last non-empty row starts with Total/Summary
  const lastFirst = (sheet.cells[coordToKey(lastRow, 0)]?.raw ?? '').trim().toLowerCase()
  const keepLastPinned = lastFirst === 'total' || lastFirst === 'summary' || lastFirst === 'totals'
  const sortable = keepLastPinned ? dataRows.filter((r) => r !== lastRow) : dataRows

  const sorted = [...sortable].sort((ra, rb) => {
    const va = getSortValue(ra, col)
    const vb = getSortValue(rb, col)
    let cmp = 0
    if (typeof va === 'number' && typeof vb === 'number') {
      cmp = va - vb
    } else {
      cmp = String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: 'base' })
    }
    return direction === 'asc' ? cmp : -cmp
  })

  const nextCells: Record<string, CellData> = {}
  // Copy header and untouched rows
  for (const [key, cell] of Object.entries(sheet.cells)) {
    const coord = parseCellKey(key)
    if (!coord) continue
    if (!sortable.includes(coord.row)) {
      nextCells[key] = cell
    }
  }
  // Place sorted rows into sortable slots
  sortable.forEach((targetRow, idx) => {
    const sourceRow = sorted[idx]
    for (let c = 0; c < sheet.cols; c++) {
      const cell = sheet.cells[coordToKey(sourceRow, c)]
      if (cell) nextCells[coordToKey(targetRow, c)] = cell
    }
  })

  return { ...sheet, cells: nextCells }
}

export type TemplateId = 'budget' | 'sales' | 'gradebook' | 'blank'

export const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'budget', label: 'Monthly Budget' },
  { id: 'sales', label: 'Sales Pipeline' },
  { id: 'gradebook', label: 'Gradebook' },
  { id: 'blank', label: 'Blank Workbook' },
]

export function createTemplateWorkbook(id: TemplateId): Workbook {
  if (id === 'blank') {
    return {
      title: 'Untitled Workbook',
      activeSheetId: 'sheet-1',
      sheets: [
        { id: 'sheet-1', name: 'Sheet1', rows: DEFAULT_ROWS, cols: DEFAULT_COLS, cells: {} },
      ],
    }
  }

  if (id === 'sales') {
    return {
      title: 'Sales Pipeline',
      activeSheetId: 'deals',
      sheets: [
        {
          id: 'deals',
          name: 'Deals',
          rows: DEFAULT_ROWS,
          cols: DEFAULT_COLS,
          cells: {
            A1: { raw: 'Account', bold: true },
            B1: { raw: 'Stage', bold: true },
            C1: { raw: 'Deal Value', bold: true, align: 'right' },
            D1: { raw: 'Win Prob', bold: true, align: 'right' },
            E1: { raw: 'Weighted', bold: true, align: 'right' },
            F1: { raw: 'Priority', bold: true, align: 'center' },
            A2: { raw: 'Alder Logistics' },
            B2: { raw: 'Proposal' },
            C2: { raw: '48000', format: 'currency' },
            D2: { raw: '0.65', format: 'percent' },
            E2: { raw: '=C2*D2', format: 'currency' },
            F2: { raw: '=IF(E2>=25000,"High","Standard")', align: 'center' },
            A3: { raw: 'Northgate Health' },
            B3: { raw: 'Negotiation' },
            C3: { raw: '72000', format: 'currency' },
            D3: { raw: '0.8', format: 'percent' },
            E3: { raw: '=C3*D3', format: 'currency' },
            F3: { raw: '=IF(E3>=25000,"High","Standard")', align: 'center' },
            A4: { raw: 'Bramble Studio' },
            B4: { raw: 'Discovery' },
            C4: { raw: '18500', format: 'currency' },
            D4: { raw: '0.35', format: 'percent' },
            E4: { raw: '=C4*D4', format: 'currency' },
            F4: { raw: '=IF(E4>=25000,"High","Standard")', align: 'center' },
            A5: { raw: 'Cedar Manufacturing' },
            B5: { raw: 'Proposal' },
            C5: { raw: '34000', format: 'currency' },
            D5: { raw: '0.55', format: 'percent' },
            E5: { raw: '=C5*D5', format: 'currency' },
            F5: { raw: '=IF(E5>=25000,"High","Standard")', align: 'center' },
            A6: { raw: 'Total', bold: true },
            B6: { raw: '=COUNTA(A2:A5)&" deals"', bold: true },
            C6: { raw: '=SUM(C2:C5)', format: 'currency', bold: true },
            D6: { raw: '=AVERAGE(D2:D5)', format: 'percent', bold: true },
            E6: { raw: '=SUM(E2:E5)', format: 'currency', bold: true },
            F6: { raw: '=COUNTIF(F2:F5,"High")&" high"', bold: true, align: 'center' },
          },
        },
        {
          id: 'summary',
          name: 'Summary',
          rows: DEFAULT_ROWS,
          cols: DEFAULT_COLS,
          cells: {
            A1: { raw: 'Metric', bold: true },
            B1: { raw: 'Value', bold: true, align: 'right' },
            A2: { raw: 'Total Pipeline' },
            B2: { raw: '=Deals!C6', format: 'currency' },
            A3: { raw: 'Weighted Forecast' },
            B3: { raw: '=Deals!E6', format: 'currency' },
            A4: { raw: 'Largest Deal' },
            B4: { raw: '=MAX(Deals!C2:C5)', format: 'currency' },
            A5: { raw: 'Average Win Rate' },
            B5: { raw: '=Deals!D6', format: 'percent' },
          },
        },
      ],
    }
  }

  if (id === 'gradebook') {
    return {
      title: 'Course Gradebook',
      activeSheetId: 'grades',
      sheets: [
        {
          id: 'grades',
          name: 'Grades',
          rows: DEFAULT_ROWS,
          cols: DEFAULT_COLS,
          cells: {
            A1: { raw: 'Student', bold: true },
            B1: { raw: 'Homework', bold: true, align: 'right' },
            C1: { raw: 'Midterm', bold: true, align: 'right' },
            D1: { raw: 'Final', bold: true, align: 'right' },
            E1: { raw: 'Weighted', bold: true, align: 'right' },
            F1: { raw: 'Letter', bold: true, align: 'center' },
            A2: { raw: 'Maya Lin' },
            B2: { raw: '94', format: 'integer' },
            C2: { raw: '88', format: 'integer' },
            D2: { raw: '92', format: 'integer' },
            E2: { raw: '=ROUND(B2*0.2+C2*0.35+D2*0.45,1)', format: 'decimal' },
            F2: { raw: '=IF(E2>=90,"A",IF(E2>=80,"B",IF(E2>=70,"C","D")))', align: 'center' },
            A3: { raw: 'David Okafor' },
            B3: { raw: '85', format: 'integer' },
            C3: { raw: '79', format: 'integer' },
            D3: { raw: '84', format: 'integer' },
            E3: { raw: '=ROUND(B3*0.2+C3*0.35+D3*0.45,1)', format: 'decimal' },
            F3: { raw: '=IF(E3>=90,"A",IF(E3>=80,"B",IF(E3>=70,"C","D")))', align: 'center' },
            A4: { raw: 'Priya Patel' },
            B4: { raw: '98', format: 'integer' },
            C4: { raw: '95', format: 'integer' },
            D4: { raw: '97', format: 'integer' },
            E4: { raw: '=ROUND(B4*0.2+C4*0.35+D4*0.45,1)', format: 'decimal' },
            F4: { raw: '=IF(E4>=90,"A",IF(E4>=80,"B",IF(E4>=70,"C","D")))', align: 'center' },
            A5: { raw: 'Samir Haddad' },
            B5: { raw: '76', format: 'integer' },
            C5: { raw: '72', format: 'integer' },
            D5: { raw: '81', format: 'integer' },
            E5: { raw: '=ROUND(B5*0.2+C5*0.35+D5*0.45,1)', format: 'decimal' },
            F5: { raw: '=IF(E5>=90,"A",IF(E5>=80,"B",IF(E5>=70,"C","D")))', align: 'center' },
            A6: { raw: 'Total', bold: true },
            B6: { raw: '=AVERAGE(B2:B5)', format: 'decimal', bold: true },
            C6: { raw: '=AVERAGE(C2:C5)', format: 'decimal', bold: true },
            D6: { raw: '=AVERAGE(D2:D5)', format: 'decimal', bold: true },
            E6: { raw: '=AVERAGE(E2:E5)', format: 'decimal', bold: true },
            F6: { raw: '=COUNTIF(F2:F5,"A")&" A"', bold: true, align: 'center' },
          },
        },
      ],
    }
  }

  // Default: Monthly Budget
  return {
    title: 'Monthly Budget',
    activeSheetId: 'budget',
    sheets: [
      {
        id: 'budget',
        name: 'Budget',
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        cells: {
          A1: { raw: 'Category', bold: true },
          B1: { raw: 'Planned', bold: true, align: 'right' },
          C1: { raw: 'Actual', bold: true, align: 'right' },
          D1: { raw: 'Variance', bold: true, align: 'right' },
          E1: { raw: 'Share', bold: true, align: 'right' },
          F1: { raw: 'Status', bold: true, align: 'center' },
          A2: { raw: 'Housing' },
          B2: { raw: '2200', format: 'currency' },
          C2: { raw: '2200', format: 'currency' },
          D2: { raw: '=B2-C2', format: 'currency' },
          E2: { raw: '=C2/$C$8', format: 'percent' },
          F2: { raw: '=IF(D2>=0,"On track","Over")', align: 'center' },
          A3: { raw: 'Groceries' },
          B3: { raw: '650', format: 'currency' },
          C3: { raw: '590', format: 'currency' },
          D3: { raw: '=B3-C3', format: 'currency' },
          E3: { raw: '=C3/$C$8', format: 'percent' },
          F3: { raw: '=IF(D3>=0,"On track","Over")', align: 'center' },
          A4: { raw: 'Utilities' },
          B4: { raw: '240', format: 'currency' },
          C4: { raw: '265', format: 'currency' },
          D4: { raw: '=B4-C4', format: 'currency' },
          E4: { raw: '=C4/$C$8', format: 'percent' },
          F4: { raw: '=IF(D4>=0,"On track","Over")', align: 'center' },
          A5: { raw: 'Transport' },
          B5: { raw: '320', format: 'currency' },
          C5: { raw: '295', format: 'currency' },
          D5: { raw: '=B5-C5', format: 'currency' },
          E5: { raw: '=C5/$C$8', format: 'percent' },
          F5: { raw: '=IF(D5>=0,"On track","Over")', align: 'center' },
          A6: { raw: 'Dining' },
          B6: { raw: '300', format: 'currency' },
          C6: { raw: '340', format: 'currency' },
          D6: { raw: '=B6-C6', format: 'currency' },
          E6: { raw: '=C6/$C$8', format: 'percent' },
          F6: { raw: '=IF(D6>=0,"On track","Over")', align: 'center' },
          A7: { raw: 'Savings' },
          B7: { raw: '800', format: 'currency' },
          C7: { raw: '800', format: 'currency' },
          D7: { raw: '=B7-C7', format: 'currency' },
          E7: { raw: '=C7/$C$8', format: 'percent' },
          F7: { raw: '=IF(D7>=0,"On track","Over")', align: 'center' },
          A8: { raw: 'Total', bold: true },
          B8: { raw: '=SUM(B2:B7)', format: 'currency', bold: true },
          C8: { raw: '=SUM(C2:C7)', format: 'currency', bold: true },
          D8: { raw: '=SUM(D2:D7)', format: 'currency', bold: true },
          E8: { raw: '=SUM(E2:E7)', format: 'percent', bold: true },
          F8: { raw: '=COUNTIF(F2:F7,"Over")&" over"', bold: true, align: 'center' },
        },
      },
      {
        id: 'summary',
        name: 'Summary',
        rows: DEFAULT_ROWS,
        cols: DEFAULT_COLS,
        cells: {
          A1: { raw: 'Budget KPI', bold: true },
          B1: { raw: 'Amount', bold: true, align: 'right' },
          A2: { raw: 'Total Planned' },
          B2: { raw: '=Budget!B8', format: 'currency' },
          A3: { raw: 'Total Actual' },
          B3: { raw: '=Budget!C8', format: 'currency' },
          A4: { raw: 'Net Variance' },
          B4: { raw: '=Budget!D8', format: 'currency' },
          A5: { raw: 'Average Category Spend' },
          B5: { raw: '=AVERAGE(Budget!C2:C7)', format: 'currency' },
          A6: { raw: 'Largest Expense' },
          B6: { raw: '=MAX(Budget!C2:C7)', format: 'currency' },
        },
      },
    ],
  }
}
