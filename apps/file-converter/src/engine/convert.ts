// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type OutputFormat =
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'webp'
  | 'txt'
  | 'html'
  | 'md'
  | 'json'
  | 'csv'
  | 'zip'
  | 'b64'

export interface FormatInfo {
  id: OutputFormat
  label: string
  mime: string
  ext: string
  group: 'Document' | 'Image' | 'Data' | 'Archive'
}

export const OUTPUT_FORMATS: FormatInfo[] = [
  { id: 'pdf', label: 'PDF', mime: 'application/pdf', ext: 'pdf', group: 'Document' },
  { id: 'png', label: 'PNG', mime: 'image/png', ext: 'png', group: 'Image' },
  { id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg', group: 'Image' },
  { id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp', group: 'Image' },
  { id: 'txt', label: 'Plain Text', mime: 'text/plain;charset=utf-8', ext: 'txt', group: 'Document' },
  { id: 'html', label: 'HTML', mime: 'text/html;charset=utf-8', ext: 'html', group: 'Document' },
  { id: 'md', label: 'Markdown', mime: 'text/markdown;charset=utf-8', ext: 'md', group: 'Document' },
  { id: 'json', label: 'JSON', mime: 'application/json;charset=utf-8', ext: 'json', group: 'Data' },
  { id: 'csv', label: 'CSV', mime: 'text/csv;charset=utf-8', ext: 'csv', group: 'Data' },
  { id: 'zip', label: 'ZIP Archive', mime: 'application/zip', ext: 'zip', group: 'Archive' },
  { id: 'b64', label: 'Base64 Text', mime: 'text/plain;charset=utf-8', ext: 'b64.txt', group: 'Data' },
]

export interface DetectedFile {
  format: string
  mime: string
  category: 'image' | 'pdf' | 'archive' | 'data' | 'text' | 'binary'
  extensionMismatch: boolean
}

export function detectFileFormat(bytes: Uint8Array, filename: string): DetectedFile {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : ''

  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { format: 'PDF', mime: 'application/pdf', category: 'pdf', extensionMismatch: ext !== '' && ext !== 'pdf' }
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { format: 'PNG', mime: 'image/png', category: 'image', extensionMismatch: ext !== '' && ext !== 'png' }
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { format: 'JPEG', mime: 'image/jpeg', category: 'image', extensionMismatch: ext !== '' && ext !== 'jpg' && ext !== 'jpeg' }
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return { format: 'WebP', mime: 'image/webp', category: 'image', extensionMismatch: ext !== '' && ext !== 'webp' }
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return { format: 'GIF', mime: 'image/gif', category: 'image', extensionMismatch: ext !== '' && ext !== 'gif' }
  }
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return { format: 'BMP', mime: 'image/bmp', category: 'image', extensionMismatch: ext !== '' && ext !== 'bmp' }
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
    return { format: 'ZIP', mime: 'application/zip', category: 'archive', extensionMismatch: ext !== '' && !['zip', 'docx', 'xlsx', 'epub', 'cbz'].includes(ext) }
  }
  if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return { format: 'GZIP', mime: 'application/gzip', category: 'archive', extensionMismatch: ext !== '' && ext !== 'gz' && ext !== 'tgz' }
  }

  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512)).trimStart()
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) {
    return { format: 'SVG', mime: 'image/svg+xml', category: 'image', extensionMismatch: ext !== '' && ext !== 'svg' }
  }
  if (ext === 'json' || head.startsWith('{') || head.startsWith('[')) {
    return { format: 'JSON', mime: 'application/json', category: 'data', extensionMismatch: false }
  }
  if (ext === 'csv') {
    return { format: 'CSV', mime: 'text/csv', category: 'data', extensionMismatch: false }
  }
  if (ext === 'html' || ext === 'htm' || head.toLowerCase().startsWith('<!doctype html') || head.toLowerCase().startsWith('<html')) {
    return { format: 'HTML', mime: 'text/html', category: 'text', extensionMismatch: false }
  }
  if (ext === 'md' || ext === 'markdown') {
    return { format: 'Markdown', mime: 'text/markdown', category: 'text', extensionMismatch: false }
  }
  if (ext === 'txt' || ext === 'log' || ext === 'yaml' || ext === 'yml' || ext === 'xml') {
    return { format: ext.toUpperCase(), mime: 'text/plain', category: 'text', extensionMismatch: false }
  }

  return { format: ext ? ext.toUpperCase() : 'Binary', mime: 'application/octet-stream', category: 'binary', extensionMismatch: false }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function outputNameFor(inputName: string, format: OutputFormat): string {
  const info = OUTPUT_FORMATS.find((f) => f.id === format)
  const ext = info?.ext ?? format
  const base = inputName.includes('.') ? inputName.replace(/\.[^.]+$/, '') : inputName
  return `${base}.${ext}`
}

// Minimal CRC-32 table for ZIP packaging (PKWARE APPNOTE / MIT style)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[i] = c >>> 0
  }
  return table
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export function buildZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint16(8, 0, true)
    lv.setUint16(10, 0, true)
    lv.setUint16(12, 0, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true)
    lv.setUint32(22, size, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)

    localParts.push(local, entry.data)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true)
    cv.setUint16(32, 0, true)
    cv.setUint16(34, 0, true)
    cv.setUint16(36, 0, true)
    cv.setUint32(38, 0, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)

    centralParts.push(central)
    offset += local.length + entry.data.length
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const total = offset + centralSize + eocd.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of [...localParts, ...centralParts, eocd]) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

function escapePdfText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function buildTextPdf(title: string, text: string): Uint8Array {
  const lines = [title, '', ...text.replace(/\r\n/g, '\n').split('\n')].slice(0, 52)
  const cmds: string[] = ['BT', '/F1 11 Tf', '54 740 Td', '14 TL']
  for (const line of lines) {
    const clean = line.replace(/[^\x20-\x7e]/g, '?').slice(0, 88)
    cmds.push(`(${escapePdfText(clean)}) Tj T*`)
  }
  cmds.push('ET')
  const stream = cmds.join('\n')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ]

  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const obj of objects) {
    offsets.push(body.length)
    body += obj
  }
  const xrefPos = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) {
    body += `${String(off).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  return new TextEncoder().encode(body)
}

function buildJpegPdf(jpegBytes: Uint8Array, width: number, height: number): Uint8Array {
  const enc = new TextEncoder()
  const pageW = 612
  const pageH = 792
  const margin = 36
  const scale = Math.min((pageW - margin * 2) / Math.max(1, width), (pageH - margin * 2) / Math.max(1, height), 1)
  const drawW = Math.round(width * scale)
  const drawH = Math.round(height * scale)
  const drawX = Math.round((pageW - drawW) / 2)
  const drawY = Math.round((pageH - drawH) / 2)
  const content = `q\n${drawW} 0 0 ${drawH} ${drawX} ${drawY} cm\n/Im0 Do\nQ\n`

  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let len = 0
  const pushStr = (s: string) => {
    const b = enc.encode(s)
    chunks.push(b)
    len += b.length
  }
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b)
    len += b.length
  }

  pushStr('%PDF-1.4\n')
  offsets.push(len)
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  offsets.push(len)
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  offsets.push(len)
  pushStr('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n')
  offsets.push(len)
  pushStr(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`)
  pushBytes(jpegBytes)
  pushStr('\nendstream\nendobj\n')
  offsets.push(len)
  pushStr(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`)

  const xrefPos = len
  let tail = `xref\n0 6\n0000000000 65535 f \n`
  for (const off of offsets) tail += `${String(off).padStart(10, '0')} 00000 n \n`
  tail += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  pushStr(tail)

  const out = new Uint8Array(len)
  let pos = 0
  for (const c of chunks) {
    out.set(c, pos)
    pos += c.length
  }
  return out
}

async function decodeImageToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image decode failed'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, img.naturalWidth || 1)
    canvas.height = Math.max(1, img.naturalHeight || 1)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'rgb(255, 255, 255)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function renderDocumentCardToCanvas(title: string, subtitle: string, lines: string[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = 960
  canvas.height = 680
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(250, 249, 245)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = 'rgb(200, 196, 188)'
  ctx.lineWidth = 2
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48)
  ctx.fillStyle = 'rgb(28, 28, 30)'
  ctx.font = 'bold 20pt sans-serif'
  ctx.fillText(title.slice(0, 64), 48, 76)
  ctx.fillStyle = 'rgb(96, 96, 102)'
  ctx.font = '11pt monospace'
  ctx.fillText(subtitle.slice(0, 84), 48, 104)
  ctx.fillStyle = 'rgb(38, 38, 42)'
  ctx.font = '12pt monospace'
  let y = 148
  for (const line of lines.slice(0, 24)) {
    ctx.fillText(line.slice(0, 84), 48, y)
    y += 20
  }
  return canvas
}

async function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error(`Failed to encode ${mime}`))
      },
      mime,
      quality,
    )
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseSimpleCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? ''
    })
    return row
  })
}

function jsonToCsv(text: string): string {
  const parsed = JSON.parse(text) as unknown
  const arr = Array.isArray(parsed) ? parsed : [parsed]
  const rows = arr.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
  if (rows.length === 0) return 'value\n' + arr.map((v) => JSON.stringify(v)).join('\n')
  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const esc = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n')
}

export interface ConvertedOutput {
  blob: Blob
  outputName: string
  mime: string
  inputBytes: number
  outputBytes: number
  detectedFormat: string
}

export async function convertFile(file: File, target: OutputFormat): Promise<ConvertedOutput> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const detected = detectFileFormat(bytes, file.name)
  const outputName = outputNameFor(file.name, target)
  const targetInfo = OUTPUT_FORMATS.find((f) => f.id === target)!

  if (target === 'zip') {
    const zipBytes = buildZip([{ name: file.name, data: bytes }])
    const blob = new Blob([zipBytes as BlobPart], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'b64') {
    const b64 = `data:${detected.mime};base64,${bytesToBase64(bytes)}`
    const blob = new Blob([b64], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'png' || target === 'jpg' || target === 'webp') {
    const mime = target === 'png' ? 'image/png' : target === 'jpg' ? 'image/jpeg' : 'image/webp'
    let canvas: HTMLCanvasElement
    if (detected.category === 'image') {
      try {
        canvas = await decodeImageToCanvas(new Blob([bytes], { type: detected.mime }))
      } catch {
        canvas = renderDocumentCardToCanvas(file.name, `${detected.format} (${formatBytes(bytes.length)})`, ['Raster fallback preview'])
      }
    } else {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 4096))
      const lines = detected.category === 'pdf'
        ? [`PDF Document — ${formatBytes(bytes.length)}`, 'Converted offline via Lacuna File Converter', '', ...text.split('\n').slice(0, 12)]
        : text.replace(/\r\n/g, '\n').split('\n')
      canvas = renderDocumentCardToCanvas(file.name, `${detected.format} → ${targetInfo.label}`, lines)
    }
    const blob = await canvasToBlob(canvas, mime)
    return { blob, outputName, mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'pdf') {
    if (detected.category === 'pdf') {
      const blob = new Blob([bytes], { type: 'application/pdf' })
      return { blob, outputName, mime: 'application/pdf', inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
    }
    if (detected.category === 'image') {
      try {
        const canvas = await decodeImageToCanvas(new Blob([bytes], { type: detected.mime }))
        const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
        const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer())
        const pdfBytes = buildJpegPdf(jpgBytes, canvas.width, canvas.height)
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
        return { blob, outputName, mime: 'application/pdf', inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
      } catch {
        const pdfBytes = buildTextPdf(file.name, `Image file (${detected.format}, ${formatBytes(bytes.length)})`)
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
        return { blob, outputName, mime: 'application/pdf', inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
      }
    }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const pdfBytes = buildTextPdf(file.name, text)
    const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' })
    return { blob, outputName, mime: 'application/pdf', inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)

  if (target === 'html') {
    const html = `<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>${escapeHtml(file.name)}</title></head>\n<body>\n<pre>${escapeHtml(text)}</pre>\n</body>\n</html>\n`
    const blob = new Blob([html], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'md') {
    const stripped = text.replace(/<[^>]+>/g, '').trim()
    const md = `# ${file.name}\n\n${stripped}\n`
    const blob = new Blob([md], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'json') {
    let jsonOut: string
    if (detected.format === 'CSV') {
      jsonOut = JSON.stringify(parseSimpleCsv(text), null, 2)
    } else if (detected.format === 'JSON') {
      try {
        jsonOut = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        jsonOut = JSON.stringify({ filename: file.name, content: text }, null, 2)
      }
    } else {
      jsonOut = JSON.stringify({ filename: file.name, format: detected.format, size: bytes.length, content: text }, null, 2)
    }
    const blob = new Blob([jsonOut], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  if (target === 'csv') {
    let csvOut: string
    if (detected.format === 'JSON') {
      try {
        csvOut = jsonToCsv(text)
      } catch {
        csvOut = `line,text\n` + text.split('\n').map((l, i) => `${i + 1},"${l.replace(/"/g, '""')}"`).join('\n')
      }
    } else {
      csvOut = `line,text\n` + text.split('\n').map((l, i) => `${i + 1},"${l.replace(/"/g, '""')}"`).join('\n')
    }
    const blob = new Blob([csvOut], { type: targetInfo.mime })
    return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
  }

  // Plain text fallback
  const plain = detected.format === 'HTML' ? text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : text
  const blob = new Blob([plain], { type: targetInfo.mime })
  return { blob, outputName, mime: targetInfo.mime, inputBytes: bytes.length, outputBytes: blob.size, detectedFormat: detected.format }
}
