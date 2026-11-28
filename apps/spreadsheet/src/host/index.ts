// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { createMockValue } from '@lacuna/host-mock'
import { createTemplateWorkbook, type Workbook } from '../model'

function isValidWorkbook(v: unknown): v is Workbook {
  if (!v || typeof v !== 'object') return false
  const wb = v as Partial<Workbook>
  return (
    typeof wb.title === 'string' &&
    typeof wb.activeSheetId === 'string' &&
    Array.isArray(wb.sheets) &&
    wb.sheets.length > 0 &&
    wb.sheets.every(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        typeof s.name === 'string' &&
        typeof s.rows === 'number' &&
        typeof s.cols === 'number' &&
        typeof s.cells === 'object' &&
        s.cells !== null,
    )
  )
}

export const workbookStore = createMockValue<Workbook>({
  key: 'lacuna:spreadsheet:workbook:v1',
  fallback: createTemplateWorkbook('budget'),
  validate: isValidWorkbook,
})
