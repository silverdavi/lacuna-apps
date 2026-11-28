// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export interface GifFrameInput {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

// 256-color fixed 6x6x6 RGB cube + 40 grays palette (fast, zero-dependency, deterministic)
const GLOBAL_PALETTE: Uint8Array = (() => {
  const pal = new Uint8Array(256 * 3)
  let idx = 0
  const steps = [0, 51, 102, 153, 204, 255]
  for (const r of steps) {
    for (const g of steps) {
      for (const b of steps) {
        pal[idx++] = r
        pal[idx++] = g
        pal[idx++] = b
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const v = Math.round((i / 39) * 255)
    pal[idx++] = v
    pal[idx++] = v
    pal[idx++] = v
  }
  return pal
})()

function mapRgbaToIndex(rgba: Uint8ClampedArray): Uint8Array {
  const n = rgba.length / 4
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4]!
    const g = rgba[i * 4 + 1]!
    const b = rgba[i * 4 + 2]!
    const ri = Math.round((r / 255) * 5)
    const gi = Math.round((g / 255) * 5)
    const bi = Math.round((b / 255) * 5)
    out[i] = ri * 36 + gi * 6 + bi
  }
  return out
}

// LZW encoder for GIF89a (8-bit minCodeSize)
function lzwEncode(indices: Uint8Array, minCodeSize = 8): Uint8Array {
  const clearCode = 1 << minCodeSize
  const eoiCode = clearCode + 1
  const out: number[] = []
  let subBlock: number[] = []

  let bitBuf = 0
  let bitCount = 0

  const flushSubBlock = () => {
    if (subBlock.length > 0) {
      out.push(subBlock.length, ...subBlock)
      subBlock = []
    }
  }

  const writeBits = (code: number, size: number) => {
    bitBuf |= code << bitCount
    bitCount += size
    while (bitCount >= 8) {
      subBlock.push(bitBuf & 0xff)
      if (subBlock.length === 255) flushSubBlock()
      bitBuf >>>= 8
      bitCount -= 8
    }
  }

  let codeSize = minCodeSize + 1
  let nextCode = eoiCode + 1
  let dict = new Map<number, number>()

  writeBits(clearCode, codeSize)

  if (indices.length > 0) {
    let prefix = indices[0]!
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i]!
      const key = (prefix << 8) | k
      const found = dict.get(key)
      if (found !== undefined) {
        prefix = found
      } else {
        writeBits(prefix, codeSize)
        if (nextCode < 4096) {
          dict.set(key, nextCode++)
          if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++
        } else {
          writeBits(clearCode, codeSize)
          dict = new Map<number, number>()
          codeSize = minCodeSize + 1
          nextCode = eoiCode + 1
        }
        prefix = k
      }
    }
    writeBits(prefix, codeSize)
  }

  writeBits(eoiCode, codeSize)
  if (bitCount > 0) {
    subBlock.push(bitBuf & 0xff)
  }
  flushSubBlock()
  out.push(0) // block terminator
  return new Uint8Array(out)
}

function pushU16(arr: number[], v: number) {
  arr.push(v & 0xff, (v >> 8) & 0xff)
}

export async function encodeAnimatedGif(
  frames: GifFrameInput[],
  opts: { width: number; fps: number; loop: boolean; boomerang: boolean; reverse: boolean },
): Promise<Blob> {
  if (frames.length === 0) throw new Error('Add at least one frame to encode a GIF')

  let ordered = [...frames]
  if (opts.reverse) ordered.reverse()
  if (opts.boomerang && ordered.length > 2) {
    ordered = [...ordered, ...ordered.slice(1, -1).reverse()]
  }

  const first = ordered[0]!
  const targetW = Math.max(32, Math.min(800, Math.round(opts.width)))
  const aspect = first.height / Math.max(1, first.width)
  const targetH = Math.max(32, Math.round(targetW * aspect))
  const delayCs = Math.max(2, Math.round(100 / Math.max(1, opts.fps)))

  const bytes: number[] = []
  // Header "GIF89a"
  bytes.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
  // Logical Screen Descriptor
  pushU16(bytes, targetW)
  pushU16(bytes, targetH)
  bytes.push(0xf7, 0x00, 0x00) // Global color table flag + 256 colors
  // Global Color Table
  for (let i = 0; i < GLOBAL_PALETTE.length; i++) bytes.push(GLOBAL_PALETTE[i]!)

  // Netscape 2.0 Application Extension for looping
  if (opts.loop) {
    bytes.push(
      0x21, 0xff, 0x0b,
      0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30,
      0x03, 0x01, 0x00, 0x00, 0x00,
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!

  for (const frame of ordered) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not decode ${frame.name}`))
      el.src = frame.dataUrl
    })
    ctx.fillStyle = 'rgb(255, 255, 255)'
    ctx.fillRect(0, 0, targetW, targetH)
    ctx.drawImage(img, 0, 0, targetW, targetH)
    const imgData = ctx.getImageData(0, 0, targetW, targetH)
    const indexed = mapRgbaToIndex(imgData.data)
    const lzw = lzwEncode(indexed, 8)

    // Graphic Control Extension
    bytes.push(0x21, 0xf9, 0x04, 0x04)
    pushU16(bytes, delayCs)
    bytes.push(0x00, 0x00)

    // Image Descriptor
    bytes.push(0x2c)
    pushU16(bytes, 0)
    pushU16(bytes, 0)
    pushU16(bytes, targetW)
    pushU16(bytes, targetH)
    bytes.push(0x00) // no local color table

    // LZW minimum code size + sub-blocks
    bytes.push(0x08)
    for (let i = 0; i < lzw.length; i++) bytes.push(lzw[i]!)
  }

  bytes.push(0x3b) // GIF Trailer
  return new Blob([new Uint8Array(bytes) as BlobPart], { type: 'image/gif' })
}

export function generateDemoFrames(): GifFrameInput[] {
  const frames: GifFrameInput[] = []
  const w = 240
  const h = 160
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgb(245, 241, 232)'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = 'rgb(28, 28, 30)'
    ctx.lineWidth = 2
    ctx.strokeRect(8, 8, w - 16, h - 16)
    const cx = 44 + i * 30
    ctx.fillStyle = i % 2 === 0 ? 'rgb(34, 87, 166)' : 'rgb(196, 77, 45)'
    ctx.beginPath()
    ctx.arc(cx, 80, 26, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgb(28, 28, 30)'
    ctx.font = 'bold 12pt monospace'
    ctx.fillText(`FRAME ${i + 1}/6`, 20, 140)
    frames.push({
      id: `demo-${i + 1}`,
      name: `frame-0${i + 1}.png`,
      dataUrl: canvas.toDataURL('image/png'),
      width: w,
      height: h,
    })
  }
  return frames
}

export async function loadImageFrame(file: File): Promise<GifFrameInput> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`Invalid image ${file.name}`))
    el.src = dataUrl
  })
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    dataUrl,
    width: img.naturalWidth || 240,
    height: img.naturalHeight || 160,
  }
}
