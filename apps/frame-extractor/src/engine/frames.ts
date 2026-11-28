// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface ExtractedFrame {
  name: string
  timeSec: number
  pngBytes: Uint8Array
  dataUrl: string
  width: number
  height: number
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

export function packFramesZip(frames: ExtractedFrame[]): Blob {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of frames) {
    const nb = enc.encode(f.name)
    const crc = crc32(f.pngBytes)
    const local = new Uint8Array(30 + nb.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, f.pngBytes.length, true)
    lv.setUint32(22, f.pngBytes.length, true)
    lv.setUint16(26, nb.length, true)
    local.set(nb, 30)
    locals.push(local, f.pngBytes)

    const central = new Uint8Array(46 + nb.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.pngBytes.length, true)
    cv.setUint32(24, f.pngBytes.length, true)
    cv.setUint16(28, nb.length, true)
    cv.setUint32(42, offset, true)
    central.set(nb, 46)
    centrals.push(central)
    offset += local.length + f.pngBytes.length
  }
  const cSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, frames.length, true)
  ev.setUint16(10, frames.length, true)
  ev.setUint32(12, cSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + cSize + 22)
  let pos = 0
  for (const p of [...locals, ...centrals, eocd]) {
    out.set(p, pos)
    pos += p.length
  }
  return new Blob([out as BlobPart], { type: 'application/zip' })
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<{ bytes: Uint8Array; dataUrl: string }> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png')
  })
  return { bytes: new Uint8Array(await blob.arrayBuffer()), dataUrl: canvas.toDataURL('image/png') }
}

export async function generateSampleExtractedFrames(count: number): Promise<ExtractedFrame[]> {
  const w = 240
  const h = 135
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const frames: ExtractedFrame[] = []

  for (let i = 0; i < count; i++) {
    ctx.fillStyle = 'rgb(28, 34, 46)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgb(196, 77, 45)'
    ctx.fillRect(16 + Math.round((i / Math.max(1, count - 1)) * 160), 42, 42, 42)
    ctx.fillStyle = 'rgb(245, 241, 232)'
    ctx.font = 'bold 11pt monospace'
    ctx.fillText(`T=${(i * 0.5).toFixed(1)}s`, 16, 118)
    const { bytes, dataUrl } = await canvasToPng(canvas)
    frames.push({
      name: `frame-${String(i + 1).padStart(2, '0')}.png`,
      timeSec: i * 0.5,
      pngBytes: bytes,
      dataUrl,
      width: w,
      height: h,
    })
  }
  return frames
}

export async function extractVideoFrames(file: File, count: number): Promise<ExtractedFrame[]> {
  const url = URL.createObjectURL(file)
  try {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.src = url
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error(`Could not decode ${file.name}`))
    })
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1
    const w = Math.min(480, video.videoWidth || 320)
    const h = Math.round((w * (video.videoHeight || 180)) / Math.max(1, video.videoWidth || 320))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!

    const out: ExtractedFrame[] = []
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : (i / (count - 1)) * Math.max(0, duration - 0.05)
      video.currentTime = t
      await new Promise<void>((resolve) => {
        const done = () => resolve()
        video.onseeked = done
        setTimeout(done, 400)
      })
      ctx.drawImage(video, 0, 0, w, h)
      const { bytes, dataUrl } = await canvasToPng(canvas)
      out.push({
        name: `frame-${String(i + 1).padStart(2, '0')}.png`,
        timeSec: t,
        pngBytes: bytes,
        dataUrl,
        width: w,
        height: h,
      })
    }
    return out
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function buildContactSheet(frames: ExtractedFrame[], cols: number): Promise<{ blob: Blob; url: string }> {
  if (frames.length === 0) throw new Error('No frames to tile')
  const fw = frames[0]!.width
  const fh = frames[0]!.height
  const pad = 8
  const rows = Math.ceil(frames.length / cols)
  const canvas = document.createElement('canvas')
  canvas.width = cols * fw + (cols + 1) * pad
  canvas.height = rows * fh + (rows + 1) * pad
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(20, 22, 26)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]!
    const col = i % cols
    const row = Math.floor(i / cols)
    const img = await new Promise<HTMLImageElement>((resolve) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.src = f.dataUrl
    })
    ctx.drawImage(img, pad + col * (fw + pad), pad + row * (fh + pad), fw, fh)
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Contact sheet encode failed'))), 'image/png')
  })
  return { blob, url: URL.createObjectURL(blob) }
}
