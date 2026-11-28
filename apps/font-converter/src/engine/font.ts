// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface FontInspection {
  filename: string
  format: 'WOFF2' | 'WOFF' | 'OTF' | 'TTF' | 'Unknown'
  mime: string
  cssFormat: string
  bytes: number
  numTables: number
  tables: string[]
  base64: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function inspectFontBytes(bytes: Uint8Array, filename: string): FontInspection {
  if (bytes.length < 12) throw new Error('Font file is too short to read SFNT/WOFF header')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tag = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!)
  const sig = view.getUint32(0, false)

  let format: FontInspection['format'] = 'Unknown'
  let mime = 'application/octet-stream'
  let cssFormat = 'truetype'
  let numTables = 0
  const tables: string[] = []

  if (tag === 'wOF2') {
    format = 'WOFF2'
    mime = 'font/woff2'
    cssFormat = 'woff2'
    numTables = view.getUint16(12, false)
  } else if (tag === 'wOFF') {
    format = 'WOFF'
    mime = 'font/woff'
    cssFormat = 'woff'
    numTables = view.getUint16(12, false)
  } else if (tag === 'OTTO') {
    format = 'OTF'
    mime = 'font/otf'
    cssFormat = 'opentype'
    numTables = view.getUint16(4, false)
  } else if (sig === 0x00010000 || tag === 'true') {
    format = 'TTF'
    mime = 'font/ttf'
    cssFormat = 'truetype'
    numTables = view.getUint16(4, false)
  }

  if ((format === 'TTF' || format === 'OTF') && numTables > 0 && numTables < 128) {
    for (let i = 0; i < numTables; i++) {
      const off = 12 + i * 16
      if (off + 4 > bytes.length) break
      tables.push(String.fromCharCode(bytes[off]!, bytes[off + 1]!, bytes[off + 2]!, bytes[off + 3]!))
    }
  }

  return {
    filename,
    format,
    mime,
    cssFormat,
    bytes: bytes.length,
    numTables,
    tables,
    base64: bytesToBase64(bytes),
  }
}

export function createSampleFontBytes(): Uint8Array {
  // Minimal valid OpenType SFNT header with 3 standard table tags (head, maxp, name)
  const tables = ['head', 'maxp', 'name']
  const buf = new Uint8Array(12 + tables.length * 16)
  const view = new DataView(buf.buffer)
  view.setUint32(0, 0x00010000, false) // TrueType sfntVersion
  view.setUint16(4, tables.length, false)
  tables.forEach((t, i) => {
    const off = 12 + i * 16
    for (let c = 0; c < 4; c++) buf[off + c] = t.charCodeAt(c)
  })
  return buf
}

export function buildFontFaceCss(opts: {
  family: string
  weight: string
  style: string
  display: string
  inlineBase64: boolean
  inspection: FontInspection
}): string {
  const src = opts.inlineBase64
    ? `url("data:${opts.inspection.mime};base64,${opts.inspection.base64}") format("${opts.inspection.cssFormat}")`
    : `url("./${opts.inspection.filename}") format("${opts.inspection.cssFormat}")`

  return `@font-face {\n  font-family: "${opts.family.trim() || 'CustomFont'}";\n  src: ${src};\n  font-weight: ${opts.weight};\n  font-style: ${opts.style};\n  font-display: ${opts.display};\n}\n`
}
