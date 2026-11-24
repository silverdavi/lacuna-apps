// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/csv-parse 0.1.0: snapshot of lacuna-components csvParse at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export type CsvOptions = { delimiter?: string; header?: boolean }
export type CsvError = { line: number; message: string }
export type CsvResult = { rows: string[][]; header: string[] | null; errors: CsvError[] }

export function parseCsv(text: string, options: CsvOptions = {}): CsvResult {
  const delimiter = options.delimiter ?? ','
  const headerWanted = options.header ?? false

  if (text.length === 0) {
    return { rows: [], header: null, errors: [] }
  }

  const rows: string[][] = []
  const errors: CsvError[] = []

  let row: string[] = []
  let field = ''
  let inQuotes = false
  let fieldStartLine = 1
  let line = 1
  let i = 0

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < text.length) {
    const ch = text.charAt(i)

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text.charAt(i + 1) === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      if (ch === '\n') {
        field += '\n'
        line += 1
      } else {
        field += ch
      }
      i += 1
      continue
    }

    if (ch === '"' && field.length === 0) {
      inQuotes = true
      fieldStartLine = line
      i += 1
      continue
    }

    if (ch === '\n') {
      pushRow()
      line += 1
      i += 1
      continue
    }

    if (ch === '\r') {
      if (i + 1 < text.length && text.charAt(i + 1) === '\n') {
        i += 1
      }
      pushRow()
      line += 1
      i += 1
      continue
    }

    if (ch === delimiter) {
      pushField()
      i += 1
      continue
    }

    field += ch
    i += 1
  }

  if (inQuotes) {
    errors.push({ line: fieldStartLine, message: 'Unterminated quote' })
  } else {
    const isTrailing = field.length === 0 && row.length === 0
    if (!isTrailing) {
      pushRow()
    }
  }

  let header: string[] | null = null
  let body = rows
  if (headerWanted) {
    const first = rows[0]
    if (first !== undefined) {
      header = first
      body = rows.slice(1)
    }
  }

  return { rows: body, header, errors }
}
