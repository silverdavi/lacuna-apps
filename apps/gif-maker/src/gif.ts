// Minimal animated-GIF encoder: packs RGBA canvas frames into a legal GIF89a byte
// stream with a 256-color quantized palette. Frames come from the preview canvases
// in App.tsx; the output is a real .gif file, downloaded via @lacuna/file-save-open.
import { GIF_FRAME_STYLES, GIF_LABEL_RGB, frameFill } from './colors'
import type { GifFrame } from './host'

export const GIF_SIGNATURE = 'GIF89a'

const MIN_CODE_SIZE = 8
const LZW_CLEAR = 256
const LZW_EOI = 257
const LZW_MAX_CODE = 4096

// Classic 256-color web-safe palette: 6x6x6 cube (216) + 40 gray steps.
const PALETTE: number[] = (() => {
  const colors: number[] = []
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        colors.push((r * 42 + 13 << 16) | (g * 42 + 13 << 8) | (b * 42 + 13))
      }
    }
  }
  for (let i = 0; i < 40; i++) {
    const g = Math.round((i / 39) * 255)
    colors.push((g << 16) | (g << 8) | g)
  }
  return colors
})()

function quantize(imageData: ImageData): Uint8Array {
  const { data } = imageData
  const index = new Uint8Array(imageData.width * imageData.height)
  for (let i = 0; i < index.length; i++) {
    const r = data[i * 4]!
    const g = data[i * 4 + 1]!
    const b = data[i * 4 + 2]!
    let best = 0
    let bestDist = Infinity
    for (let p = 0; p < 256; p++) {
      const pr = PALETTE[p]! >>> 16
      const pg = (PALETTE[p]! >>> 8) & 0xff
      const pb = PALETTE[p]! & 0xff
      const dr = r - pr
      const dg = g - pg
      const db = b - pb
      const d = dr * dr * 2 + dg * dg * 2 + db * db
      if (d < bestDist) {
        bestDist = d
        best = p
      }
    }
    index[i] = best
  }
  return index
}

// LZW encoder matching the GIF spec: codes are written LSB-first, the code width
// starts at minCodeSize + 1 and grows when the dictionary reaches 2^codeSize entries.
// dict[k * 256 + c] holds the code for extending the string of code k with byte c.
function lzwEncode(data: Uint8Array): Uint8Array {
  const out: number[] = []
  let cur = 0
  let nbits = 0
  let codeSize = MIN_CODE_SIZE + 1
  let nextCode = LZW_EOI + 1
  const dict = new Int32Array(LZW_MAX_CODE * 256).fill(-1)

  const put = (v: number, len: number): void => {
    cur |= (v & ((1 << len) - 1)) << nbits
    nbits += len
    while (nbits >= 8) {
      out.push(cur & 0xff)
      cur = Math.floor(cur / 256)
      nbits -= 8
    }
  }

  let k = -1
  for (let i = 0; i < data.length; i++) {
    const c = data[i]!
    if (k === -1) {
      k = c
      continue
    }
    const key = k * 256 + c
    const p = key < dict.length ? dict[key]! : -1
    if (p === -1) {
      put(k, codeSize)
      if (nextCode < LZW_MAX_CODE) {
        dict[key] = nextCode
        nextCode += 1
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1
      }

      k = c
    } else {
      k = p
    }
  }
  if (k !== -1) put(k, codeSize)
  put(LZW_EOI, codeSize)
  if (nbits > 0) out.push(cur & 0xff)
  return Uint8Array.from(out)
}

function lzwBlock(bytes: Uint8Array): Uint8Array {
  const encoded = lzwEncode(bytes)
  const out: number[] = [MIN_CODE_SIZE]
  for (let i = 0; i < encoded.length; i += 255) {
    const chunk = encoded.slice(i, i + 255)
    out.push(chunk.length, ...chunk)
  }
  out.push(0)
  return Uint8Array.from(out)
}

export function encodeGif(frames: ImageData[], delayMs: number, width: number, height: number): Uint8Array {
  const out: number[] = []
  for (let i = 0; i < GIF_SIGNATURE.length; i++) out.push(GIF_SIGNATURE.charCodeAt(i) & 0xff)

  // Logical Screen Descriptor: 7-bit packed palette, background index 0.
  out.push(
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0xf7, 0, 0,
  )

  // Global color table: 256 entries, 3 bytes each.
  for (const color of PALETTE) {
    out.push((color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff)
  }

  const delayCs = Math.max(0, Math.round(delayMs / 10))
  for (const frame of frames) {
    const indices = quantize(frame)
    // Graphic Control Extension: disposal 1, user input 0, delay in 1/100 s.
    out.push(0x21, 0xf9, 0x04, 0x01, delayCs & 0xff, (delayCs >> 8) & 0xff, 0, 0)
    // Image Descriptor: full-canvas image at (0, 0).
    out.push(0x2c, 0, 0, 0, 0, width & 0xff, (width >> 8) & 0xff, height & 0xff, (height >> 8) & 0xff, 0)
    out.push(...Array.from(lzwBlock(indices)))
  }

  out.push(0x3b)
  return Uint8Array.from(out)
}

export function gifBlobFromCanvases(canvases: HTMLCanvasElement[], delayMs: number): Blob {
  const first = canvases[0]
  const ctx = first?.getContext('2d')
  if (!first || !ctx) throw new Error('no frame to export')
  const frames = canvases.map((c) => ctx.getImageData(0, 0, c.width, c.height))
  const bytes = encodeGif(frames, delayMs, first.width, first.height)
  return new Blob([bytes as unknown as BlobPart], { type: 'image/gif' })
}

// Deterministic sample frames: one solid color plus a white label, so a real
// .gif can be produced from the sample set without any image decoding.
export function renderSampleFrames(frames: GifFrame[], width: number, height: number): HTMLCanvasElement[] {
  return frames.map((frame, i) => {
    const [r, g, b] = GIF_FRAME_STYLES[i % GIF_FRAME_STYLES.length]!
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    ctx.fillStyle = frameFill([r, g, b])
    ctx.fillRect(0, 0, width, height)
    ctx.font = `bold ${Math.max(16, Math.round(width / 12))}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = GIF_LABEL_RGB
    ctx.fillText(frame.name, width / 2, height / 2)
    return canvas
  })
}
