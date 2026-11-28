// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { markdownToHtml, sanitizeHtml } from '@lacuna/markdown-to-html'

export type DocInputFormat = 'markdown' | 'html' | 'txt' | 'rtf'
export type DocOutputFormat = 'html' | 'markdown' | 'txt' | 'rtf' | 'docx' | 'pdf'

export const SAMPLE_MARKDOWN = `# Quarterly Design Brief

## Summary
This document converts cleanly across **Markdown**, *HTML*, Plain Text, RTF, DOCX, and PDF completely offline.

## Key Deliverables
- Offline document interchange without external uploads
- Sanitized HTML preview with clean typography
- Valid WordprocessingML (\`.docx\`) and PDF export

> Keep every conversion deterministic, readable, and fast.
`

export function rtfToPlainText(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, '')
    .replace(/\\[a-z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '')
    .trim()
}

export function htmlToMarkdown(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? '').replace(/\s+/g, ' ')
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const inner = Array.from(el.childNodes).map(walk).join('')

    switch (tag) {
      case 'h1': return `# ${inner.trim()}\n\n`
      case 'h2': return `## ${inner.trim()}\n\n`
      case 'h3': return `### ${inner.trim()}\n\n`
      case 'h4': return `#### ${inner.trim()}\n\n`
      case 'p': return `${inner.trim()}\n\n`
      case 'br': return '\n'
      case 'strong':
      case 'b': return `**${inner.trim()}**`
      case 'em':
      case 'i': return `*${inner.trim()}*`
      case 'code': return el.parentElement?.tagName.toLowerCase() === 'pre' ? inner : `\`${inner.trim()}\``
      case 'pre': return `\`\`\`\n${inner.trim()}\n\`\`\`\n\n`
      case 'blockquote': return `${inner.trim().split('\n').map((l) => `> ${l}`).join('\n')}\n\n`
      case 'a': {
        const href = el.getAttribute('href') ?? ''
        return href ? `[${inner.trim()}](${href})` : inner
      }
      case 'ul':
        return `${Array.from(el.children).map((li) => `- ${walk(li).trim()}`).join('\n')}\n\n`
      case 'ol':
        return `${Array.from(el.children).map((li, i) => `${i + 1}. ${walk(li).trim()}`).join('\n')}\n\n`
      case 'li':
        return inner.trim()
      case 'hr':
        return '---\n\n'
      default:
        return inner
    }
  }

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function htmlToPlainText(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim()
}

export function plainToRtf(plain: string): string {
  const escaped = plain
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[^\x20-\x7e]/g, '?'))
    .join('\\par\n')
  return `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Helvetica;}}\\f0\\fs24\n${escaped}\n}`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// CRC-32 + minimal store ZIP for valid OOXML .docx packaging
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

function buildDocxBytes(plain: string): Uint8Array {
  const enc = new TextEncoder()
  const paragraphs = plain
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join('')

  const files: Array<{ name: string; data: Uint8Array }> = [
    {
      name: '[Content_Types].xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>',
      ),
    },
    {
      name: '_rels/.rels',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      name: 'word/document.xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
          `<w:body>${paragraphs}</w:body></w:document>`,
      ),
    },
  ]

  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const nameBytes = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, f.data.length, true)
    lv.setUint32(22, f.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    locals.push(local, f.data)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.data.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)
    offset += local.length + f.data.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const p of [...locals, ...centrals, eocd]) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

function buildPdfBytes(plain: string): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const lines = plain.replace(/\r\n/g, '\n').split('\n').slice(0, 52)
  const cmds = ['BT', '/F1 11 Tf', '54 740 Td', '14 TL']
  for (const line of lines) {
    cmds.push(`(${esc(line.replace(/[^\x20-\x7e]/g, '?').slice(0, 88))}) Tj T*`)
  }
  cmds.push('ET')
  const stream = cmds.join('\n')

  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const o of objs) {
    offsets.push(body.length)
    body += o
  }
  const xref = body.length
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) body += `${String(off).padStart(10, '0')} 00000 n \n`
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(body)
}

export function normalizeToHtml(input: string, from: DocInputFormat): string {
  if (from === 'markdown') return sanitizeHtml(markdownToHtml(input))
  if (from === 'html') return sanitizeHtml(input)
  const plain = from === 'rtf' ? rtfToPlainText(input) : input
  const paras = plain
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeXml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('\n')
  return sanitizeHtml(paras)
}

export function convertDocument(
  input: string,
  from: DocInputFormat,
  to: DocOutputFormat,
  title: string,
): { textPreview: string; blob: Blob; filename: string; mime: string; htmlPreview: string } {
  const htmlBody = normalizeToHtml(input, from)
  const plain = from === 'txt' ? input : from === 'rtf' ? rtfToPlainText(input) : htmlToPlainText(htmlBody)
  const safeBase = (title.trim() || 'document').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'document'

  if (to === 'html') {
    const full = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${escapeXml(title || 'Document')}</title></head>\n<body>\n${htmlBody}\n</body>\n</html>\n`
    return {
      textPreview: full,
      blob: new Blob([full], { type: 'text/html;charset=utf-8' }),
      filename: `${safeBase}.html`,
      mime: 'text/html;charset=utf-8',
      htmlPreview: htmlBody,
    }
  }
  if (to === 'markdown') {
    const md = from === 'markdown' ? input : htmlToMarkdown(htmlBody)
    return {
      textPreview: md,
      blob: new Blob([md], { type: 'text/markdown;charset=utf-8' }),
      filename: `${safeBase}.md`,
      mime: 'text/markdown;charset=utf-8',
      htmlPreview: htmlBody,
    }
  }
  if (to === 'txt') {
    return {
      textPreview: plain,
      blob: new Blob([plain], { type: 'text/plain;charset=utf-8' }),
      filename: `${safeBase}.txt`,
      mime: 'text/plain;charset=utf-8',
      htmlPreview: htmlBody,
    }
  }
  if (to === 'rtf') {
    const rtf = plainToRtf(plain)
    return {
      textPreview: rtf,
      blob: new Blob([rtf], { type: 'application/rtf' }),
      filename: `${safeBase}.rtf`,
      mime: 'application/rtf',
      htmlPreview: htmlBody,
    }
  }
  if (to === 'docx') {
    const bytes = buildDocxBytes(plain)
    return {
      textPreview: `Binary OOXML Word document (.docx) — ${bytes.length} bytes\nContains [Content_Types].xml, _rels/.rels, word/document.xml`,
      blob: new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
      filename: `${safeBase}.docx`,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      htmlPreview: htmlBody,
    }
  }
  const pdfBytes = buildPdfBytes(plain)
  return {
    textPreview: `Binary PDF document (.pdf) — ${pdfBytes.length} bytes\nReady to download.`,
    blob: new Blob([pdfBytes as BlobPart], { type: 'application/pdf' }),
    filename: `${safeBase}.pdf`,
    mime: 'application/pdf',
    htmlPreview: htmlBody,
  }
}
