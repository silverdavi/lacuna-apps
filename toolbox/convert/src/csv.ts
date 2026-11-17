// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { ConvertInvalid, ConvertResult, Converter } from './types'
import { registerConverter } from './registry'

export type CsvRow = Record<string, string>

function fail(from: 'csv' | 'json', to: 'csv' | 'json', code: string, message: string): ConvertInvalid {
  return { ok: false, reason: 'invalid', from, to, code, message }
}

function asText(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof Uint8Array) return new TextDecoder('utf-8').decode(input)
  if (input instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(input))
  return String(input ?? '')
}

/** RFC 4180-ish records. Returns a structured error for unclosed quotes. */
export function parseCsvRecords(text: string): { ok: true; rows: string[][] } | { ok: false; code: string; message: string } {
  const src = text.replace(/^\uFEFF/, '')
  if (!src.trim()) return { ok: false, code: 'empty', message: 'CSV is empty.' }

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let quoted = false

  while (i < src.length) {
    const ch = src[i]!
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        quoted = false
        i += 1
        continue
      }
      field += ch
      i += 1
      continue
    }
    if (ch === '"') {
      quoted = true
      i += 1
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
      i += 1
      continue
    }
    field += ch
    i += 1
  }

  if (quoted) return { ok: false, code: 'unclosed-quote', message: 'CSV has an unclosed quoted field.' }

  row.push(field)
  rows.push(row)
  while (rows.length > 1 && rows[rows.length - 1]!.every((c) => c === '')) rows.pop()
  return { ok: true, rows }
}

function recordsToObjects(rows: string[][]): { ok: true; output: CsvRow[] } | { ok: false; code: string; message: string } {
  const header = rows[0]
  if (!header || header.every((h) => h.trim() === '')) {
    return { ok: false, code: 'no-header', message: 'CSV needs a header row.' }
  }
  const names = header.map((h, i) => h.trim() || `column_${i + 1}`)
  const seen = new Set<string>()
  for (const n of names) {
    if (seen.has(n)) return { ok: false, code: 'duplicate-header', message: `CSV header repeats "${n}".` }
    seen.add(n)
  }
  const out: CsvRow[] = []
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r]!
    if (cells.length === 1 && cells[0] === '' && r === rows.length - 1) continue
    if (cells.length !== names.length) {
      return {
        ok: false,
        code: 'ragged-row',
        message: `CSV row ${r + 1} has ${cells.length} field(s); expected ${names.length}.`,
      }
    }
    const obj: CsvRow = {}
    for (let c = 0; c < names.length; c++) obj[names[c]!] = cells[c]!
    out.push(obj)
  }
  return { ok: true, output: out }
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function objectsToCsv(rows: CsvRow[]): string {
  if (rows.length === 0) return ''
  const keys: string[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k)
        keys.push(k)
      }
    }
  }
  const lines = [keys.map(csvEscape).join(',')]
  for (const row of rows) lines.push(keys.map((k) => csvEscape(String(row[k] ?? ''))).join(','))
  return lines.join('\n')
}

function asObjects(input: unknown): { ok: true; rows: CsvRow[] } | { ok: false; code: string; message: string } {
  let value: unknown = input
  if (typeof input === 'string' || input instanceof Uint8Array || input instanceof ArrayBuffer) {
    const text = asText(input).replace(/^\uFEFF/, '').trim()
    if (!text) return { ok: false, code: 'empty', message: 'JSON is empty.' }
    try {
      value = JSON.parse(text)
    } catch {
      return { ok: false, code: 'invalid-json', message: 'JSON could not be parsed.' }
    }
  }
  if (!Array.isArray(value)) {
    return { ok: false, code: 'not-array', message: 'JSON must be an array of objects.' }
  }
  const rows: CsvRow[] = []
  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, code: 'not-object', message: `JSON item ${i} is not an object.` }
    }
    const obj: CsvRow = {}
    for (const [k, v] of Object.entries(item as Record<string, unknown>)) obj[k] = v == null ? '' : String(v)
    rows.push(obj)
  }
  return { ok: true, rows }
}

export const csvToJson: Converter<string | Uint8Array, CsvRow[]> = {
  from: 'csv',
  to: 'json',
  convert(input): ConvertResult<CsvRow[]> {
    const parsed = parseCsvRecords(asText(input))
    if (!parsed.ok) return fail('csv', 'json', parsed.code, parsed.message)
    const mapped = recordsToObjects(parsed.rows)
    if (!mapped.ok) return fail('csv', 'json', mapped.code, mapped.message)
    return { ok: true, output: mapped.output, warnings: [] }
  },
}

export const jsonToCsv: Converter<string | Uint8Array | CsvRow[], string> = {
  from: 'json',
  to: 'csv',
  convert(input): ConvertResult<string> {
    const mapped = asObjects(input)
    if (!mapped.ok) return fail('json', 'csv', mapped.code, mapped.message)
    return { ok: true, output: objectsToCsv(mapped.rows), warnings: [] }
  },
}

registerConverter(csvToJson)
registerConverter(jsonToCsv)
