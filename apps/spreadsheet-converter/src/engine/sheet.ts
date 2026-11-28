// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { parseCsv, toCsv } from '@lacuna/csv-parse'

export type SheetOutput = 'xlsx' | 'csv' | 'tsv' | 'json' | 'markdown' | 'html' | 'sql'

export interface ParsedTable {
  headers: string[]
  rows: string[][]
}

export const SAMPLE_CSV = `id,product,category,price,in_stock
101,Mechanical Keyboard,Hardware,149.00,true
102,USB-C Dock,Accessories,79.50,true
103,Studio Monitor,Displays,389.00,false
104,Desk Mat,Accessories,24.00,true`

export function parseTableInput(raw: string): ParsedTable {
  const trimmed = raw.trim()
  if (!trimmed) return { headers: [], rows: [] }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as unknown
    const arr = Array.isArray(parsed) ? parsed : [parsed]
    const objs: Record<string, unknown>[] = arr.map((x) =>
      x !== null && typeof x === 'object' && !Array.isArray(x)
        ? (x as Record<string, unknown>)
        : { value: x },
    )
    const headers = Array.from(new Set(objs.flatMap((o) => Object.keys(o))))
    const rows = objs.map((o) =>
      headers.map((h) => {
        const v = o[h]
        return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
      }),
    )
    return { headers, rows }
  }

  const firstLine = trimmed.split(/\r?\n/)[0] ?? ''
  const delimiter = firstLine.includes('\t') ? '\t' : ','
  const res = parseCsv(trimmed, { delimiter, header: true })
  return { headers: res.header ?? [], rows: res.rows }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function colLetter(idx: number): string {
  let n = idx
  let out = ''
  while (n >= 0) {
    out = String.fromCharCode((n % 26) + 65) + out
    n = Math.floor(n / 26) - 1
  }
  return out
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function packZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const e of entries) {
    const nb = enc.encode(e.name)
    const crc = crc32(e.data)
    const local = new Uint8Array(30 + nb.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, nb.length, true)
    local.set(nb, 30)
    locals.push(local, e.data)

    const central = new Uint8Array(46 + nb.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, nb.length, true)
    cv.setUint32(42, offset, true)
    central.set(nb, 46)
    centrals.push(central)
    offset += local.length + e.data.length
  }
  const cSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + cSize + 22)
  let pos = 0
  for (const p of [...locals, ...centrals, eocd]) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

function buildXlsxBytes(table: ParsedTable, sheetName: string): Uint8Array {
  const enc = new TextEncoder()
  const allRows = [table.headers, ...table.rows]
  const xmlRows = allRows
    .map((row, rIdx) => {
      const rNum = rIdx + 1
      const cells = row
        .map((val, cIdx) => {
          const ref = `${colLetter(cIdx)}${rNum}`
          if (rIdx > 0 && /^-?\d+(\.\d+)?$/.test(val.trim())) {
            return `<c r="${ref}"><v>${val.trim()}</v></c>`
          }
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(val)}</t></is></c>`
        })
        .join('')
      return `<row r="${rNum}">${cells}</row>`
    })
    .join('')

  const safeSheet = escapeXml((sheetName.trim() || 'Sheet1').slice(0, 31))
  return packZip([
    {
      name: '[Content_Types].xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '</Types>',
      ),
    },
    {
      name: '_rels/.rels',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          `<sheetData>${xmlRows}</sheetData></worksheet>`,
      ),
    },
  ])
}

export function exportTable(
  table: ParsedTable,
  target: SheetOutput,
  tableName: string,
): { preview: string; blob: Blob; filename: string; mime: string } {
  const safeName = (tableName.trim() || 'items').replace(/[^a-zA-Z0-9_]/g, '_') || 'items'

  if (target === 'xlsx') {
    const bytes = buildXlsxBytes(table, safeName)
    return {
      preview: `Binary Excel Workbook (.xlsx) — ${bytes.length} bytes\n${table.rows.length} rows × ${table.headers.length} columns`,
      blob: new Blob([bytes as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      filename: `${safeName}.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  }

  if (target === 'csv' || target === 'tsv') {
    const out = toCsv([table.headers, ...table.rows], { delimiter: target === 'tsv' ? '\t' : ',' })
    const mime = target === 'tsv' ? 'text/tab-separated-values;charset=utf-8' : 'text/csv;charset=utf-8'
    return { preview: out, blob: new Blob([out], { type: mime }), filename: `${safeName}.${target}`, mime }
  }

  if (target === 'json') {
    const objs = table.rows.map((r) => {
      const o: Record<string, string> = {}
      table.headers.forEach((h, i) => {
        o[h] = r[i] ?? ''
      })
      return o
    })
    const out = JSON.stringify(objs, null, 2)
    return { preview: out, blob: new Blob([out], { type: 'application/json;charset=utf-8' }), filename: `${safeName}.json`, mime: 'application/json;charset=utf-8' }
  }

  if (target === 'markdown') {
    const head = `| ${table.headers.join(' | ')} |`
    const sep = `| ${table.headers.map(() => '---').join(' | ')} |`
    const body = table.rows.map((r) => `| ${table.headers.map((_, i) => (r[i] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`)
    const out = [head, sep, ...body].join('\n')
    return { preview: out, blob: new Blob([out], { type: 'text/markdown;charset=utf-8' }), filename: `${safeName}.md`, mime: 'text/markdown;charset=utf-8' }
  }

  if (target === 'html') {
    const ths = table.headers.map((h) => `<th>${escapeXml(h)}</th>`).join('')
    const trs = table.rows
      .map((r) => `    <tr>${table.headers.map((_, i) => `<td>${escapeXml(r[i] ?? '')}</td>`).join('')}</tr>`)
      .join('\n')
    const out = `<table>\n  <thead>\n    <tr>${ths}</tr>\n  </thead>\n  <tbody>\n${trs}\n  </tbody>\n</table>`
    return { preview: out, blob: new Blob([out], { type: 'text/html;charset=utf-8' }), filename: `${safeName}.html`, mime: 'text/html;charset=utf-8' }
  }

  // SQL INSERT
  const cols = table.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(', ')
  const stmts = table.rows.map((r) => {
    const vals = table.headers
      .map((_, i) => {
        const v = (r[i] ?? '').trim()
        if (v === '') return 'NULL'
        if (/^-?\d+(\.\d+)?$/.test(v) || v === 'true' || v === 'false') return v
        return `'${v.replace(/'/g, "''")}'`
      })
      .join(', ')
    return `INSERT INTO ${safeName} (${cols}) VALUES (${vals});`
  })
  const out = stmts.join('\n')
  return { preview: out, blob: new Blob([out], { type: 'application/sql;charset=utf-8' }), filename: `${safeName}.sql`, mime: 'application/sql;charset=utf-8' }
}
