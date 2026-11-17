// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Image decode and preview on the browser's own decoders. SVG is untrusted:
// it is only ever loaded through an <img> element, where scripts, event
// handlers, and external references do not run or load.
import { FormatError, formatInfo, indexOfAscii, type ConversionWarning, type FormatId, type Result } from '@lacuna/formats'
import type { Viewer } from '@lacuna/preview'
import './transcode'

export const IMAGE_FORMATS: FormatId[] = ['png', 'jpeg', 'gif', 'webp', 'svg']

/** Larger images are refused before decoding (a small file can declare a huge canvas). */
export const MAX_IMAGE_PIXELS = 100_000_000

export interface DecodedImage {
  /** Object URL for an <img>; revoke with releaseImage. */
  url: string
  width: number
  height: number
  mime: string
}

const u16be = (b: Uint8Array, i: number) => (b[i]! << 8) | b[i + 1]!
const u16le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8)
const u24le = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)
const u32be = (b: Uint8Array, i: number) => ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!

/** Pixel size from the header, without decoding. Null when the header does not say. */
export function headerSize(bytes: Uint8Array, format: FormatId): { width: number; height: number } | null {
  const b = bytes
  if (format === 'png' && b.length >= 24 && String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!) === 'IHDR') return { width: u32be(b, 16), height: u32be(b, 20) }
  if (format === 'gif' && b.length >= 10) return { width: u16le(b, 6), height: u16le(b, 8) }
  if (format === 'webp' && b.length >= 30) {
    const chunk = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!)
    if (chunk === 'VP8X') return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 }
    if (chunk === 'VP8 ') return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff }
    if (chunk === 'VP8L' && b.length >= 25) {
      const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
    }
  }
  if (format === 'jpeg') {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i += 1; continue }
      const marker = b[i + 1]!
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
      // SOF0..SOF15 except DHT (C4), JPG (C8), DAC (CC)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(b, i + 7), height: u16be(b, i + 5) }
      }
      i += 2 + u16be(b, i + 2)
    }
  }
  return null
}

function svgNotes(bytes: Uint8Array): ConversionWarning[] {
  const active = ['<script', 'onload=', 'onerror=', 'onclick=', '<foreignobject', 'javascript:']
  const text = new TextDecoder().decode(bytes.subarray(0, 512 * 1024)).toLowerCase()
  const hits = active.some((s) => text.includes(s)) || indexOfAscii(bytes, 'href="http') >= 0
  return hits ? [{ code: 'svg-inert', message: 'This SVG contains scripts or links. It is shown as a picture; they do not run or load.' }] : []
}

export async function decodeImage(bytes: Uint8Array, format: FormatId): Promise<Result<DecodedImage>> {
  const info = formatInfo(format)
  if (!info || info.kind !== 'image') throw new FormatError('unsupported', `${format} is not an image format Lacuna reads.`)
  const declared = headerSize(bytes, format)
  if (declared && declared.width * declared.height > MAX_IMAGE_PIXELS) {
    throw new FormatError('too-large', `This image is ${declared.width.toLocaleString()} × ${declared.height.toLocaleString()} pixels, over the ${(MAX_IMAGE_PIXELS / 1e6).toFixed(0)}-megapixel preview limit.`)
  }
  // The MIME type comes from the detected format, never from the file's own claim.
  const url = URL.createObjectURL(new Blob([bytes.slice()], { type: info.mime }))
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  try {
    await img.decode()
  } catch (e) {
    URL.revokeObjectURL(url)
    throw new FormatError('corrupt', `This ${info.label} could not be decoded. It may be damaged or incomplete.`, { cause: e })
  }
  const warnings = format === 'svg' ? svgNotes(bytes) : []
  return { output: { url, width: img.naturalWidth, height: img.naturalHeight, mime: info.mime }, warnings }
}

export function releaseImage(img: DecodedImage): void {
  URL.revokeObjectURL(img.url)
}

/** FilePreview viewer for PNG, JPEG, GIF, WebP, and SVG. */
export const imageViewer: Viewer<DecodedImage> = {
  id: 'lacuna.image.preview',
  label: 'Image viewer',
  formats: IMAGE_FORMATS,
  maxBytes: 30 * 1024 * 1024,
  load: () => import('./view').then((m) => m.imageView),
}

export { imageConvertPlan, IMAGE_OUT_MIME, RASTER_FORMATS } from './plan'
