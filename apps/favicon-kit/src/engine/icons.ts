// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface IconKitSpec {
  appName: string
  monogram: string
  bgStyle: 'cobalt' | 'rust' | 'ink' | 'forest'
  rounded: boolean
  customImageUrl: string | null
}

const BG_RGB: Record<IconKitSpec['bgStyle'], string> = {
  cobalt: 'rgb(34, 87, 166)',
  rust: 'rgb(196, 77, 45)',
  ink: 'rgb(28, 28, 30)',
  forest: 'rgb(36, 110, 72)',
}

const TARGET_SIZES = [16, 32, 48, 180, 192, 512] as const

async function drawIconCanvas(spec: IconKitSpec, size: number): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  if (spec.rounded) {
    const r = Math.round(size * 0.18)
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(size - r, 0)
    ctx.quadraticCurveTo(size, 0, size, r)
    ctx.lineTo(size, size - r)
    ctx.quadraticCurveTo(size, size, size - r, size)
    ctx.lineTo(r, size)
    ctx.quadraticCurveTo(0, size, 0, size - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.clip()
  }

  if (spec.customImageUrl) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Could not decode source image'))
      el.src = spec.customImageUrl!
    })
    ctx.drawImage(img, 0, 0, size, size)
  } else {
    ctx.fillStyle = BG_RGB[spec.bgStyle]
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'rgb(250, 249, 245)'
    ctx.font = `bold ${Math.round(size * 0.48)}pt sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText((spec.monogram.trim() || 'L').slice(0, 2).toUpperCase(), size / 2, size / 2 + size * 0.03)
  }
  return canvas
}

async function canvasToPngBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function buildMultiIco(frames: Array<{ size: number; png: Uint8Array }>): Uint8Array {
  const count = frames.length
  const headerSize = 6 + count * 16
  const totalPayload = frames.reduce((s, f) => s + f.png.length, 0)
  const out = new Uint8Array(headerSize + totalPayload)
  const view = new DataView(out.buffer)

  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true)
  view.setUint16(4, count, true)

  let offset = headerSize
  frames.forEach((f, idx) => {
    const entry = 6 + idx * 16
    out[entry] = f.size >= 256 ? 0 : f.size
    out[entry + 1] = f.size >= 256 ? 0 : f.size
    view.setUint16(entry + 4, 1, true)
    view.setUint16(entry + 6, 32, true)
    view.setUint32(entry + 8, f.png.length, true)
    view.setUint32(entry + 12, offset, true)
    out.set(f.png, offset)
    offset += f.png.length
  })
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

export const HTML_HEAD_SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`

export interface GeneratedKit {
  zipBlob: Blob
  icoBlob: Blob
  previewUrl: string
  files: Array<{ name: string; bytes: number }>
}

export async function generateIconKit(spec: IconKitSpec): Promise<GeneratedKit> {
  const enc = new TextEncoder()
  const pngBySize = new Map<number, Uint8Array>()
  for (const size of TARGET_SIZES) {
    const canvas = await drawIconCanvas(spec, size)
    pngBySize.set(size, await canvasToPngBytes(canvas))
  }

  const icoBytes = buildMultiIco([
    { size: 16, png: pngBySize.get(16)! },
    { size: 32, png: pngBySize.get(32)! },
    { size: 48, png: pngBySize.get(48)! },
  ])

  const manifestJson = JSON.stringify(
    {
      name: spec.appName.trim() || 'My App',
      short_name: (spec.appName.trim() || 'App').slice(0, 12),
      display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )

  const entries: Array<{ name: string; data: Uint8Array }> = [
    { name: 'favicon.ico', data: icoBytes },
    { name: 'favicon-16x16.png', data: pngBySize.get(16)! },
    { name: 'favicon-32x32.png', data: pngBySize.get(32)! },
    { name: 'apple-touch-icon.png', data: pngBySize.get(180)! },
    { name: 'icon-192.png', data: pngBySize.get(192)! },
    { name: 'icon-512.png', data: pngBySize.get(512)! },
    { name: 'site.webmanifest', data: enc.encode(manifestJson) },
    { name: 'head-tags.html', data: enc.encode(HTML_HEAD_SNIPPET) },
  ]

  const zipBytes = packZip(entries)
  const previewBlob = new Blob([pngBySize.get(192)! as BlobPart], { type: 'image/png' })

  return {
    zipBlob: new Blob([zipBytes as BlobPart], { type: 'application/zip' }),
    icoBlob: new Blob([icoBytes as BlobPart], { type: 'image/x-icon' }),
    previewUrl: URL.createObjectURL(previewBlob),
    files: entries.map((e) => ({ name: e.name, bytes: e.data.length })),
  }
}
