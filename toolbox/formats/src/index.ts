// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Format table and detection. Pure TypeScript: no React, no DOM, no libraries.
// Magic bytes decide; the extension only names a file whose bytes carry no
// signature (plain text, HTML) or explains a mismatch.

export type FormatId =
  | 'html' | 'text' | 'docx' | 'zip' | 'pdf'
  | 'png' | 'jpeg' | 'gif' | 'webp' | 'svg'
  | 'tex' | (string & {})

export type FormatKind = 'document' | 'pdf' | 'image' | 'archive' | 'text'

export interface FormatInfo {
  id: FormatId
  label: string
  kind: FormatKind
  mime: string
  extensions: string[]
  /** True when the bytes carry a signature `sniff` checks. An extension-only match then means the file is damaged or mislabeled. */
  signed: boolean
  /** Generic format this one is packaged in (DOCX is a ZIP). */
  container?: FormatId
  sniff?(bytes: Uint8Array): boolean
}

/** Lossy or surprising steps are reported, never silent. */
export interface ConversionWarning {
  code: string
  message: string
}

export interface Result<T> {
  output: T
  warnings: ConversionWarning[]
}

export type FormatErrorCode = 'corrupt' | 'encrypted' | 'unsupported' | 'too-large' | 'empty'

/** Thrown by format modules for a file they cannot open. `message` is shown to the user. */
export class FormatError extends Error {
  readonly code: FormatErrorCode
  constructor(code: FormatErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'FormatError'
    this.code = code
  }
}

export function isFormatError(e: unknown): e is FormatError {
  return e instanceof Error && e.name === 'FormatError' && typeof (e as FormatError).code === 'string'
}

// ---------------------------------------------------------------- sniffing

const startsWith = (b: Uint8Array, sig: number[], at = 0) =>
  b.length >= at + sig.length && sig.every((x, i) => b[at + i] === x)

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0))

/** Index of an ASCII needle in bytes, or -1. */
export function indexOfAscii(b: Uint8Array, needle: string, from = 0, to = b.length): number {
  const n = ascii(needle)
  const end = Math.min(to, b.length) - n.length
  outer: for (let i = from; i <= end; i++) {
    for (let j = 0; j < n.length; j++) if (b[i + j] !== n[j]) continue outer
    return i
  }
  return -1
}

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const isZip = (b: Uint8Array) => startsWith(b, ZIP) || startsWith(b, [0x50, 0x4b, 0x05, 0x06])
// A Word package names word/document.xml in a local header or the central directory.
const isDocx = (b: Uint8Array) => isZip(b) && indexOfAscii(b, 'word/document.xml') >= 0

const textHead = (b: Uint8Array, n = 1024) => {
  let s = ''
  const end = Math.min(n, b.length)
  for (let i = 0; i < end; i++) s += String.fromCharCode(b[i]!)
  return s.replace(/^\uFEFF|^\xEF\xBB\xBF/, '')
}
const isSvg = (b: Uint8Array) => {
  const head = textHead(b, 4096).replace(/<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>/gi, '').trimStart()
  return /^<svg[\s>]/i.test(head)
}
const isHtml = (b: Uint8Array) => /^\s*(<!doctype html|<html[\s>])/i.test(textHead(b))

const FORMATS: FormatInfo[] = [
  { id: 'pdf', label: 'PDF', kind: 'pdf', mime: 'application/pdf', extensions: ['pdf'], signed: true,
    // %PDF- may follow a little junk; readers accept it within the first 1024 bytes.
    sniff: (b) => indexOfAscii(b, '%PDF-', 0, 1024) >= 0 },
  { id: 'docx', label: 'Word document', kind: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extensions: ['docx'], signed: true, container: 'zip', sniff: isDocx },
  { id: 'png', label: 'PNG image', kind: 'image', mime: 'image/png', extensions: ['png'], signed: true,
    sniff: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { id: 'jpeg', label: 'JPEG image', kind: 'image', mime: 'image/jpeg', extensions: ['jpg', 'jpeg', 'jfif'], signed: true,
    sniff: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  { id: 'gif', label: 'GIF image', kind: 'image', mime: 'image/gif', extensions: ['gif'], signed: true,
    sniff: (b) => startsWith(b, ascii('GIF87a')) || startsWith(b, ascii('GIF89a')) },
  { id: 'webp', label: 'WebP image', kind: 'image', mime: 'image/webp', extensions: ['webp'], signed: true,
    sniff: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8) },
  { id: 'svg', label: 'SVG image', kind: 'image', mime: 'image/svg+xml', extensions: ['svg'], signed: true, sniff: isSvg },
  // Generic containers and text come last so specific signatures win.
  { id: 'zip', label: 'ZIP archive', kind: 'archive', mime: 'application/zip', extensions: ['zip'], signed: true, sniff: isZip },
  { id: 'html', label: 'HTML', kind: 'document', mime: 'text/html', extensions: ['html', 'htm'], signed: false, sniff: isHtml },
  { id: 'text', label: 'Plain text', kind: 'text', mime: 'text/plain', extensions: ['txt', 'md', 'csv'], signed: false },
  { id: 'tex', label: 'TeX source', kind: 'text', mime: 'application/x-tex', extensions: ['tex'], signed: false },
]

const registry = new Map<FormatId, FormatInfo>(FORMATS.map((f) => [f.id, f]))

/** Add or replace a format. Later registrations are sniffed before the generic zip, html, and text entries. */
export function registerFormat(info: FormatInfo): void {
  registry.set(info.id, info)
}

export function formatInfo(id: FormatId): FormatInfo | null {
  return registry.get(id) ?? null
}

export function listFormats(): FormatInfo[] {
  return [...registry.values()]
}

export function extensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/)
  return m ? m[1]! : ''
}

export function formatForExtension(ext: string): FormatInfo | null {
  const e = ext.toLowerCase().replace(/^\./, '')
  for (const f of registry.values()) if (f.extensions.includes(e)) return f
  return null
}

export interface Detection {
  /** What the bytes are, or what the name says when the bytes carry no signature. */
  format: FormatInfo | null
  /** How `format` was decided. */
  by: 'signature' | 'extension' | null
  /** The format the file name claims, when it differs from `format`. */
  claimed: FormatInfo | null
}

const GENERIC = new Set<FormatId>(['zip', 'html', 'text', 'tex'])

export function detect(bytes: Uint8Array, filename = ''): Detection {
  const byName = formatForExtension(extensionOf(filename))
  const ordered = [...registry.values()].sort((a, b) => Number(GENERIC.has(a.id)) - Number(GENERIC.has(b.id)))
  const bySig = ordered.find((f) => f.sniff?.(bytes)) ?? null
  // A .docx that is a ZIP without Word parts is a damaged DOCX, not an archive; the DOCX reader says so.
  if (bySig && byName?.container === bySig.id) return { format: byName, by: 'extension', claimed: null }
  if (bySig) return { format: bySig, by: 'signature', claimed: byName && byName.id !== bySig.id ? byName : null }
  // A signed format named by extension but without its signature is damaged or mislabeled; say so.
  if (byName && !byName.signed) return { format: byName, by: 'extension', claimed: null }
  return { format: null, by: null, claimed: byName }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
