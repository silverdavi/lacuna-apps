// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type PageSize = 'letter' | 'a4'

export interface PdfBuildOptions {
  title: string
  body: string
  pageSize: PageSize
  fontSize: number
  watermark: string
  includePageNumbers: boolean
}

export interface PdfInspectResult {
  version: string
  pageCount: number
  bytes: number
  extractedText: string
}

export const SAMPLE_TEXT = `Project Architecture Summary

1. Offline Execution
Every conversion runs directly inside the browser with zero network requests and deterministic output.

2. Multi-Page Layout
Long documents wrap cleanly across pages with automatic pagination, optional header titles, and subtle watermarks.

3. Inspection & Extraction
Drop any PDF to read its PDF header version, count page objects, and extract uncompressed text streams into Plain Text, Markdown, or JSON.`

function escapePdf(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapLine(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line]
  const words = line.split(/\s+/)
  const out: string[] = []
  let current = ''
  for (const w of words) {
    if (!current) current = w
    else if (current.length + 1 + w.length <= maxChars) current += ' ' + w
    else {
      out.push(current)
      current = w
    }
  }
  if (current) out.push(current)
  return out
}

export function buildMultiPagePdf(opts: PdfBuildOptions): { bytes: Uint8Array; pageCount: number } {
  const [pageW, pageH] = opts.pageSize === 'a4' ? [595, 842] : [612, 792]
  const margin = 54
  const fontSize = Math.max(8, Math.min(20, opts.fontSize))
  const leading = Math.round(fontSize * 1.45)
  const charsPerLine = Math.max(30, Math.floor((pageW - margin * 2) / (fontSize * 0.55)))
  const linesPerPage = Math.max(10, Math.floor((pageH - margin * 2 - 40) / leading))

  const rawLines = opts.body.replace(/\r\n/g, '\n').split('\n')
  const wrapped: string[] = []
  if (opts.title.trim()) {
    wrapped.push(opts.title.trim())
    wrapped.push('')
  }
  for (const l of rawLines) {
    const clean = l.replace(/[^\x20-\x7e]/g, '?')
    if (clean === '') wrapped.push('')
    else wrapped.push(...wrapLine(clean, charsPerLine))
  }

  const pages: string[][] = []
  for (let i = 0; i < wrapped.length; i += linesPerPage) {
    pages.push(wrapped.slice(i, i + linesPerPage))
  }
  if (pages.length === 0) pages.push([''])

  // Objects: 1=Catalog, 2=Pages, 3=Font, then pairs of (Page, Content)
  const objects: string[] = []
  const pageObjNums: number[] = []
  for (let i = 0; i < pages.length; i++) {
    pageObjNums.push(4 + i * 2)
  }

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  )
  objects.push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n')

  pages.forEach((lines, idx) => {
    const pageNum = 4 + idx * 2
    const contentNum = pageNum + 1
    const cmds: string[] = []

    if (opts.watermark.trim()) {
      const wm = escapePdf(opts.watermark.trim().replace(/[^\x20-\x7e]/g, '?').slice(0, 40))
      cmds.push('q', '0.86 0.86 0.86 rg', 'BT', '/F1 42 Tf', `${Math.round(pageW * 0.2)} ${Math.round(pageH * 0.45)} Td`, `(${wm}) Tj`, 'ET', 'Q')
    }

    cmds.push('0 0 0 rg', 'BT', `/F1 ${fontSize} Tf`, `${margin} ${pageH - margin - fontSize} Td`, `${leading} TL`)
    for (const line of lines) {
      cmds.push(`(${escapePdf(line)}) Tj T*`)
    }
    cmds.push('ET')

    if (opts.includePageNumbers) {
      cmds.push('BT', '/F1 9 Tf', `${pageW - margin - 52} ${Math.round(margin * 0.55)} Td`, `(Page ${idx + 1} / ${pages.length}) Tj`, 'ET')
    }

    const stream = cmds.join('\n')
    objects.push(
      `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`,
    )
    objects.push(`${contentNum} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`)
  })

  let out = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const obj of objects) {
    offsets.push(out.length)
    out += obj
  }
  const xref = out.length
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return { bytes: new TextEncoder().encode(out), pageCount: pages.length }
}

export function inspectPdfBytes(bytes: Uint8Array): PdfInspectResult {
  const raw = new TextDecoder('latin1').decode(bytes)
  const verMatch = raw.match(/%PDF-(\d+\.\d+)/)
  if (!verMatch) throw new Error('File does not start with a valid %PDF header')

  const pageMatches = raw.match(/\/Type\s*\/Page\b/g)
  const pageCount = Math.max(1, pageMatches ? pageMatches.length : 1)

  // Extract literal text strings from uncompressed Tj / TJ operators
  const extracted: string[] = []
  const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g
  let m: RegExpExecArray | null
  while ((m = tjRegex.exec(raw)) !== null) {
    const unescaped = m[1]!
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
    if (unescaped.trim().length > 0) extracted.push(unescaped)
  }

  return {
    version: verMatch[1]!,
    pageCount,
    bytes: bytes.length,
    extractedText:
      extracted.length > 0
        ? extracted.join('\n')
        : 'No uncompressed plain-text streams found (PDF may use Flate/compressed or image-only streams).',
  }
}
