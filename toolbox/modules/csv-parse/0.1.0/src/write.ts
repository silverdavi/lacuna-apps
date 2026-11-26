// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/csv-parse 0.1.0: snapshot of lacuna-components csvParse at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import type { CsvResult } from './parse'

export function toCsv(rows: string[][], options: { delimiter?: string } = {}): string {
  const delimiter = options.delimiter ?? ','
  const parts: string[] = []
  for (const row of rows) {
    const cells: string[] = []
    for (const value of row) {
      cells.push(encodeField(value, delimiter))
    }
    parts.push(cells.join(delimiter))
  }
  return parts.join('\n')
}

function encodeField(value: string, delimiter: string): string {
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

export function toRecords(result: CsvResult): Record<string, string>[] {
  if (result.header === null) {
    return []
  }
  const records: Record<string, string>[] = []
  for (const row of result.rows) {
    const record: Record<string, string> = {}
    result.header.forEach((key, index) => {
      const value = row[index]
      record[key] = value === undefined ? '' : value
    })
    records.push(record)
  }
  return records
}
