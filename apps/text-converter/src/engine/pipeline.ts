// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import {
  base64Decode,
  base64Encode,
  fromHex,
  toHex,
  urlDecode,
  urlEncode,
} from '@lacuna/codecs'
import {
  dedupeLines,
  slugify,
  sortLines,
  toCamelCase,
  toKebabCase,
  toLower,
  toPascalCase,
  toSnakeCase,
  toTitleCase,
  toUpper,
  trimLines,
} from '@lacuna/text-transforms'

export type TransformOp =
  | 'upper'
  | 'lower'
  | 'title'
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'slug'
  | 'trim'
  | 'remove-empty'
  | 'dedupe'
  | 'sort-asc'
  | 'sort-desc'
  | 'reverse-lines'
  | 'number-lines'
  | 'b64-enc'
  | 'b64-dec'
  | 'url-enc'
  | 'url-dec'
  | 'html-enc'
  | 'html-dec'
  | 'hex-enc'
  | 'hex-dec'
  | 'json-escape'
  | 'rot13'
  | 'morse-enc'
  | 'extract-emails'
  | 'extract-urls'
  | 'extract-numbers'

export interface TransformSpec {
  id: TransformOp
  label: string
  group: 'Case' | 'Lines' | 'Encode' | 'Extract'
}

export const TRANSFORMS: TransformSpec[] = [
  { id: 'upper', label: 'UPPERCASE', group: 'Case' },
  { id: 'lower', label: 'lowercase', group: 'Case' },
  { id: 'title', label: 'Title Case', group: 'Case' },
  { id: 'camel', label: 'camelCase', group: 'Case' },
  { id: 'pascal', label: 'PascalCase', group: 'Case' },
  { id: 'snake', label: 'snake_case', group: 'Case' },
  { id: 'kebab', label: 'kebab-case', group: 'Case' },
  { id: 'constant', label: 'CONSTANT_CASE', group: 'Case' },
  { id: 'slug', label: 'URL Slug', group: 'Case' },
  { id: 'trim', label: 'Trim each line', group: 'Lines' },
  { id: 'remove-empty', label: 'Remove empty lines', group: 'Lines' },
  { id: 'dedupe', label: 'Deduplicate lines', group: 'Lines' },
  { id: 'sort-asc', label: 'Sort lines A → Z', group: 'Lines' },
  { id: 'sort-desc', label: 'Sort lines Z → A', group: 'Lines' },
  { id: 'reverse-lines', label: 'Reverse line order', group: 'Lines' },
  { id: 'number-lines', label: 'Number lines', group: 'Lines' },
  { id: 'b64-enc', label: 'Base64 encode', group: 'Encode' },
  { id: 'b64-dec', label: 'Base64 decode', group: 'Encode' },
  { id: 'url-enc', label: 'URL encode', group: 'Encode' },
  { id: 'url-dec', label: 'URL decode', group: 'Encode' },
  { id: 'html-enc', label: 'HTML entities encode', group: 'Encode' },
  { id: 'html-dec', label: 'HTML entities decode', group: 'Encode' },
  { id: 'hex-enc', label: 'Hex encode', group: 'Encode' },
  { id: 'hex-dec', label: 'Hex decode', group: 'Encode' },
  { id: 'json-escape', label: 'JSON string escape', group: 'Encode' },
  { id: 'rot13', label: 'ROT13', group: 'Encode' },
  { id: 'morse-enc', label: 'Morse code encode', group: 'Encode' },
  { id: 'extract-emails', label: 'Extract email addresses', group: 'Extract' },
  { id: 'extract-urls', label: 'Extract URLs', group: 'Extract' },
  { id: 'extract-numbers', label: 'Extract numbers', group: 'Extract' },
]

export interface PipelineStep {
  id: string
  op: TransformOp
  enabled: boolean
}

const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
  I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
  Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
  '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
}

function encodeHtmlEntities(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function rot13(s: string): string {
  return s.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base)
  })
}

function perLine(text: string, fn: (line: string) => string): string {
  return text.replace(/\r\n/g, '\n').split('\n').map(fn).join('\n')
}

export function applyOp(text: string, op: TransformOp): string {
  switch (op) {
    case 'upper': return toUpper(text)
    case 'lower': return toLower(text)
    case 'title': return perLine(text, toTitleCase)
    case 'camel': return perLine(text, toCamelCase)
    case 'pascal': return perLine(text, toPascalCase)
    case 'snake': return perLine(text, toSnakeCase)
    case 'kebab': return perLine(text, toKebabCase)
    case 'constant': return perLine(text, (l) => toSnakeCase(l).toUpperCase())
    case 'slug': return perLine(text, slugify)
    case 'trim': return trimLines(text)
    case 'remove-empty': return text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0).join('\n')
    case 'dedupe': return dedupeLines(text.replace(/\r\n/g, '\n'))
    case 'sort-asc': return sortLines(text.replace(/\r\n/g, '\n'), false)
    case 'sort-desc': return sortLines(text.replace(/\r\n/g, '\n'), true)
    case 'reverse-lines': return text.replace(/\r\n/g, '\n').split('\n').reverse().join('\n')
    case 'number-lines': return text.replace(/\r\n/g, '\n').split('\n').map((l, i) => `${i + 1}. ${l}`).join('\n')
    case 'b64-enc': return base64Encode(text)
    case 'b64-dec': return base64Decode(text)
    case 'url-enc': return urlEncode(text)
    case 'url-dec': return urlDecode(text)
    case 'html-enc': return encodeHtmlEntities(text)
    case 'html-dec': return decodeHtmlEntities(text)
    case 'hex-enc': return toHex(text)
    case 'hex-dec': return fromHex(text.replace(/\s+/g, ''))
    case 'json-escape': return JSON.stringify(text)
    case 'rot13': return rot13(text)
    case 'morse-enc':
      return text
        .toUpperCase()
        .split(/\s+/)
        .map((w) => w.split('').map((c) => MORSE[c] ?? c).join(' '))
        .join(' / ')
    case 'extract-emails':
      return (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []).join('\n')
    case 'extract-urls':
      return (text.match(/https?:\/\/[^\s"'<>]+/g) ?? []).join('\n')
    case 'extract-numbers':
      return (text.match(/-?\d+(?:\.\d+)?/g) ?? []).join('\n')
  }
}

export function runPipeline(input: string, steps: PipelineStep[]): { output: string; error: string | null } {
  let current = input
  for (const step of steps) {
    if (!step.enabled) continue
    try {
      current = applyOp(current, step.op)
    } catch (e) {
      const spec = TRANSFORMS.find((t) => t.id === step.op)
      return {
        output: current,
        error: `${spec?.label ?? step.op}: ${e instanceof Error ? e.message : 'Transform failed'}`,
      }
    }
  }
  return { output: current, error: null }
}
