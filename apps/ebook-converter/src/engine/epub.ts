// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { markdownToHtml, sanitizeHtml } from '@lacuna/markdown-to-html'

export interface Chapter {
  id: string
  title: string
  markdown: string
  html: string
}

export const SAMPLE_BOOK_MD = `# Chapter 1: Offline Foundations

Every book in this converter is assembled directly on your device.

Level-1 headings automatically become distinct EPUB chapters in the table of contents.

# Chapter 2: Clean Packaging

An EPUB 3 archive begins with an uncompressed mimetype entry followed by container metadata, OPF manifest, navigation document, and XHTML chapters.

# Chapter 3: Portable Reading

Export as an EPUB for e-readers or as a standalone HTML file for browsers.
`

export function splitMarkdownChapters(md: string): Chapter[] {
  const normalized = md.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []
  const rawParts = normalized.split(/(?=^# )/m).map((s) => s.trim()).filter(Boolean)
  return rawParts.map((part, idx) => {
    const firstLine = part.split('\n')[0] ?? ''
    const title = firstLine.startsWith('# ') ? firstLine.slice(2).trim() : `Chapter ${idx + 1}`
    return {
      id: `ch-${idx + 1}`,
      title,
      markdown: part,
      html: sanitizeHtml(markdownToHtml(part)),
    }
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

function packStoreZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
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

export function buildEpubBlob(opts: {
  title: string
  author: string
  language: string
  chapters: Chapter[]
}): Blob {
  const enc = new TextEncoder()
  const bookTitle = opts.title.trim() || 'Untitled Book'
  const bookAuthor = opts.author.trim() || 'Unknown Author'
  const lang = opts.language.trim() || 'en'
  const uid = `urn:uuid:lacuna-${Date.now()}`

  const manifestItems = opts.chapters
    .map((c) => `    <item id="${c.id}" href="${c.id}.xhtml" media-type="application/xhtml+xml"/>`)
    .join('\n')
  const spineItems = opts.chapters.map((c) => `    <itemref idref="${c.id}"/>`).join('\n')
  const navItems = opts.chapters
    .map((c) => `      <li><a href="${c.id}.xhtml">${escapeXml(c.title)}</a></li>`)
    .join('\n')

  const entries: Array<{ name: string; data: Uint8Array }> = [
    // EPUB spec requires uncompressed mimetype as first entry
    { name: 'mimetype', data: enc.encode('application/epub+zip') },
    {
      name: 'META-INF/container.xml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
          '  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>\n' +
          '</container>\n',
      ),
    },
    {
      name: 'OEBPS/content.opf',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">\n' +
          '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n' +
          `    <dc:identifier id="bookid">${escapeXml(uid)}</dc:identifier>\n` +
          `    <dc:title>${escapeXml(bookTitle)}</dc:title>\n` +
          `    <dc:creator>${escapeXml(bookAuthor)}</dc:creator>\n` +
          `    <dc:language>${escapeXml(lang)}</dc:language>\n` +
          '  </metadata>\n' +
          '  <manifest>\n' +
          '    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>\n' +
          `${manifestItems}\n` +
          '  </manifest>\n' +
          '  <spine>\n' +
          `${spineItems}\n` +
          '  </spine>\n' +
          '</package>\n',
      ),
    },
    {
      name: 'OEBPS/nav.xhtml',
      data: enc.encode(
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\n' +
          `<head><title>${escapeXml(bookTitle)}</title></head>\n` +
          '<body><nav epub:type="toc"><h1>Contents</h1><ol>\n' +
          `${navItems}\n` +
          '</ol></nav></body></html>\n',
      ),
    },
  ]

  for (const ch of opts.chapters) {
    const xhtml =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
      `<head><title>${escapeXml(ch.title)}</title></head>\n` +
      `<body>${ch.html}</body></html>\n`
    entries.push({ name: `OEBPS/${ch.id}.xhtml`, data: enc.encode(xhtml) })
  }

  const bytes = packStoreZip(entries)
  return new Blob([bytes as BlobPart], { type: 'application/epub+zip' })
}

export function buildStandaloneHtml(title: string, author: string, chapters: Chapter[]): Blob {
  const body = chapters.map((c) => `<section>${c.html}</section>`).join('\n<hr/>\n')
  const doc = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${escapeXml(title)}</title></head>\n<body>\n<header><h1>${escapeXml(title)}</h1><p>${escapeXml(author)}</p></header>\n${body}\n</body>\n</html>\n`
  return new Blob([doc], { type: 'text/html;charset=utf-8' })
}
