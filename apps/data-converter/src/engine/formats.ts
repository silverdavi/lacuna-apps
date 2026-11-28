// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { parseCsv, toCsv } from '@lacuna/csv-parse'

export type DataFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv' | 'tsv' | 'ini' | 'env' | 'query'

export const DATA_FORMATS: Array<{ id: DataFormat; label: string; ext: string; mime: string }> = [
  { id: 'json', label: 'JSON', ext: 'json', mime: 'application/json;charset=utf-8' },
  { id: 'yaml', label: 'YAML', ext: 'yaml', mime: 'text/yaml;charset=utf-8' },
  { id: 'toml', label: 'TOML', ext: 'toml', mime: 'text/plain;charset=utf-8' },
  { id: 'xml', label: 'XML', ext: 'xml', mime: 'application/xml;charset=utf-8' },
  { id: 'csv', label: 'CSV', ext: 'csv', mime: 'text/csv;charset=utf-8' },
  { id: 'tsv', label: 'TSV', ext: 'tsv', mime: 'text/tab-separated-values;charset=utf-8' },
  { id: 'ini', label: 'INI', ext: 'ini', mime: 'text/plain;charset=utf-8' },
  { id: 'env', label: '.env', ext: 'env', mime: 'text/plain;charset=utf-8' },
  { id: 'query', label: 'Query String', ext: 'txt', mime: 'text/plain;charset=utf-8' },
]

export const SAMPLE_JSON = JSON.stringify(
  {
    service: 'lacuna-convert',
    version: 2,
    offline: true,
    limits: { maxFiles: 50, timeoutMs: 4000 },
    formats: ['json', 'yaml', 'toml', 'xml', 'csv'],
  },
  null,
  2,
)

export const SAMPLE_TABLE = JSON.stringify(
  [
    { name: 'Ada Lovelace', role: 'Architect', year: 1843, active: true },
    { name: 'Grace Hopper', role: 'Compiler Lead', year: 1952, active: true },
    { name: 'Alan Turing', role: 'Researcher', year: 1936, active: false },
  ],
  null,
  2,
)

function parseScalar(raw: string): unknown {
  const s = raw.trim()
  if (s === '' || s === 'null' || s === '~') return null
  if (s === 'true') return true
  if (s === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"')
  }
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((part) => parseScalar(part))
  }
  return s
}

function parseYaml(text: string): unknown {
  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0 && !l.trim().startsWith('#'))
  if (lines.length === 0) return {}

  const root: Record<string, unknown> = {}
  const stack: Array<{ indent: number; obj: Record<string, unknown> | unknown[]; key?: string }> = [
    { indent: -1, obj: root },
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const indent = line.length - line.trimStart().length
    const trimmed = line.trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop()
    }
    const top = stack[stack.length - 1]!

    if (trimmed.startsWith('- ')) {
      const val = parseScalar(trimmed.slice(2))
      if (Array.isArray(top.obj)) {
        top.obj.push(val)
      } else if (top.key && Array.isArray(top.obj[top.key])) {
        ;(top.obj[top.key] as unknown[]).push(val)
      }
      continue
    }

    const colon = trimmed.indexOf(':')
    if (colon < 0) continue
    const key = trimmed.slice(0, colon).trim()
    const rest = trimmed.slice(colon + 1).trim()

    if (!Array.isArray(top.obj)) {
      if (rest === '') {
        const nextLine = lines[i + 1]?.trim() ?? ''
        if (nextLine.startsWith('- ')) {
          const arr: unknown[] = []
          top.obj[key] = arr
          stack.push({ indent, obj: arr, key })
        } else {
          const child: Record<string, unknown> = {}
          top.obj[key] = child
          stack.push({ indent, obj: child, key })
        }
      } else {
        top.obj[key] = parseScalar(rest)
      }
    }
  }
  return root
}

function formatYamlScalar(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean' || typeof v === 'number') return String(v)
  const s = String(v)
  if (s === '' || /[:#\n\r]|^\s|\s$|^(true|false|null|yes|no|\d+(\.\d+)?)$/i.test(s)) {
    return JSON.stringify(s)
  }
  return s
}

function serializeYaml(data: unknown, indent = 0): string {
  const pad = ' '.repeat(indent)
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return data
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const nested = serializeYaml(item, indent + 2)
          const first = nested.trimStart()
          return `${pad}- ${first}`
        }
        return `${pad}- ${formatYamlScalar(item)}`
      })
      .join('\n')
  }
  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    return entries
      .map(([k, v]) => {
        if (v !== null && typeof v === 'object') {
          return `${pad}${k}:\n${serializeYaml(v, indent + 2)}`
        }
        return `${pad}${k}: ${formatYamlScalar(v)}`
      })
      .join('\n')
  }
  return formatYamlScalar(data)
}

function parseToml(text: string): Record<string, unknown> {
  const root: Record<string, unknown> = {}
  let current = root
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('[') && line.endsWith(']')) {
      const section = line.slice(1, -1).trim()
      const parts = section.split('.')
      let target = root
      for (const p of parts) {
        if (typeof target[p] !== 'object' || target[p] === null) target[p] = {}
        target = target[p] as Record<string, unknown>
      }
      current = target
      continue
    }
    const eq = line.indexOf('=')
    if (eq > 0) {
      const k = line.slice(0, eq).trim()
      const v = line.slice(eq + 1).trim()
      current[k] = parseScalar(v)
    }
  }
  return root
}

function serializeToml(data: unknown): string {
  const obj = typeof data === 'object' && data !== null && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : { items: data }
  const topLines: string[] = []
  const sections: string[] = []

  const fmtVal = (v: unknown): string => {
    if (typeof v === 'string') return JSON.stringify(v)
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    if (Array.isArray(v)) return `[${v.map(fmtVal).join(', ')}]`
    return JSON.stringify(v ?? '')
  }

  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const lines = [`[${k}]`]
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        lines.push(`${sk} = ${fmtVal(sv)}`)
      }
      sections.push(lines.join('\n'))
    } else {
      topLines.push(`${k} = ${fmtVal(v)}`)
    }
  }
  return [...topLines, ...sections].join('\n\n')
}

function parseXml(text: string): unknown {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')
  const err = doc.querySelector('parsererror')
  if (err) throw new Error(err.textContent?.slice(0, 140) || 'Invalid XML')

  function nodeToValue(el: Element): unknown {
    const children = Array.from(el.children)
    if (children.length === 0) return parseScalar(el.textContent ?? '')
    const obj: Record<string, unknown> = {}
    for (const child of children) {
      const val = nodeToValue(child)
      const tag = child.tagName
      if (tag in obj) {
        const existing = obj[tag]
        obj[tag] = Array.isArray(existing) ? [...existing, val] : [existing, val]
      } else {
        obj[tag] = val
      }
    }
    return obj
  }

  return { [doc.documentElement.tagName]: nodeToValue(doc.documentElement) }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function serializeXml(data: unknown, tag = 'root', indent = 0): string {
  const pad = ' '.repeat(indent)
  if (Array.isArray(data)) {
    const inner = data.map((item) => serializeXml(item, 'item', indent + 2)).join('\n')
    return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`
  }
  if (data !== null && typeof data === 'object') {
    const inner = Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => serializeXml(v, k.replace(/[^a-zA-Z0-9_-]/g, '_') || 'field', indent + 2))
      .join('\n')
    return `${pad}<${tag}>\n${inner}\n${pad}</${tag}>`
  }
  return `${pad}<${tag}>${escapeXml(String(data ?? ''))}</${tag}>`
}

function flattenObject(data: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (Array.isArray(data)) {
    data.forEach((item, i) => flattenObject(item, prefix ? `${prefix}_${i}` : String(i), out))
  } else if (data !== null && typeof data === 'object') {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      flattenObject(v, prefix ? `${prefix}_${k}` : k, out)
    }
  } else {
    out[prefix || 'VALUE'] = String(data ?? '')
  }
  return out
}

function sortKeysDeep(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(sortKeysDeep)
  if (data !== null && typeof data === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const k of Object.keys(data as Record<string, unknown>).sort()) {
      sorted[k] = sortKeysDeep((data as Record<string, unknown>)[k])
    }
    return sorted
  }
  return data
}

export function parseData(text: string, format: DataFormat): unknown {
  const trimmed = text.trim()
  if (!trimmed) return {}
  if (format === 'json') return JSON.parse(trimmed)
  if (format === 'yaml') return parseYaml(trimmed)
  if (format === 'toml' || format === 'ini') return parseToml(trimmed)
  if (format === 'xml') return parseXml(trimmed)
  if (format === 'csv' || format === 'tsv') {
    const res = parseCsv(trimmed, { delimiter: format === 'tsv' ? '\t' : ',', header: true })
    const headers = res.header ?? []
    if (headers.length === 0) return []
    return res.rows.map((row) => {
      const obj: Record<string, unknown> = {}
      headers.forEach((h: string, i: number) => {
        obj[h] = parseScalar(row[i] ?? '')
      })
      return obj
    })
  }
  if (format === 'env') {
    const obj: Record<string, unknown> = {}
    for (const raw of trimmed.split(/\r?\n/)) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq > 0) obj[line.slice(0, eq).trim()] = parseScalar(line.slice(eq + 1))
    }
    return obj
  }
  const params = new URLSearchParams(trimmed.startsWith('?') ? trimmed.slice(1) : trimmed)
  const obj: Record<string, unknown> = {}
  params.forEach((v, k) => {
    obj[k] = parseScalar(v)
  })
  return obj
}

export function serializeData(
  rawData: unknown,
  format: DataFormat,
  opts: { minify: boolean; sortKeys: boolean },
): string {
  const data = opts.sortKeys ? sortKeysDeep(rawData) : rawData
  if (format === 'json') return JSON.stringify(data, null, opts.minify ? 0 : 2)
  if (format === 'yaml') return serializeYaml(data)
  if (format === 'toml' || format === 'ini') return serializeToml(data)
  if (format === 'xml') return `<?xml version="1.0" encoding="UTF-8"?>\n${serializeXml(data, 'root', 0)}`
  if (format === 'csv' || format === 'tsv') {
    const arr = Array.isArray(data) ? data : [data]
    const objects: Record<string, unknown>[] = arr.map((item) =>
      item !== null && typeof item === 'object' && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : { value: item },
    )
    const headers = Array.from(new Set(objects.flatMap((o) => Object.keys(o))))
    const rows = objects.map((o) =>
      headers.map((h) => {
        const v = o[h]
        return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
      }),
    )
    return toCsv([headers, ...rows], { delimiter: format === 'tsv' ? '\t' : ',' })
  }
  if (format === 'env') {
    const flat = flattenObject(data)
    return Object.entries(flat)
      .map(([k, v]) => `${k.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}=${/\s/.test(v) ? JSON.stringify(v) : v}`)
      .join('\n')
  }
  const flat = flattenObject(data)
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(flat)) params.set(k, v)
  return params.toString()
}
