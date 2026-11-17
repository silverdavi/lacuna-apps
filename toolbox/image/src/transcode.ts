// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import { registerConverter, type ConvertResult, type Converter, type FormatId } from '@lacuna/convert'
import { FormatError } from '@lacuna/formats'
import { IMAGE_OUT_MIME, RASTER_FORMATS, imageConvertPlan, type RasterFormat } from './plan'

function asBytes(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  throw new FormatError('unsupported', 'Image conversion needs file bytes.')
}

async function canvasEncode(bytes: Uint8Array, from: FormatId, to: RasterFormat, mime: string, quality?: number): Promise<ConvertResult<Uint8Array>> {
  const { decodeImage, releaseImage } = await import('./index')
  const decoded = await decodeImage(bytes, from)
  try {
    const img = new Image()
    img.src = decoded.output.url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || decoded.output.width
    canvas.height = img.naturalHeight || decoded.output.height
    if (!canvas.width || !canvas.height) {
      return { ok: false, reason: 'invalid', from, to, code: 'empty-image', message: 'This image has no pixel size to encode.' }
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return { ok: false, reason: 'invalid', from, to, code: 'no-canvas', message: 'This browser could not create a drawing surface.' }
    }
    if (to === 'jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mime, quality)
    })
    if (!blob) {
      return { ok: false, reason: 'invalid', from, to, code: 'encode-failed', message: `Could not encode ${to}.` }
    }
    return { ok: true, output: new Uint8Array(await blob.arrayBuffer()), warnings: decoded.warnings }
  } finally {
    releaseImage(decoded.output)
  }
}

function makeConverter(from: FormatId, to: RasterFormat): Converter<Uint8Array, Uint8Array> {
  const mime = IMAGE_OUT_MIME[to]
  return {
    from,
    to,
    async convert(input): Promise<ConvertResult<Uint8Array>> {
      const plan = imageConvertPlan(from, to)
      if (!plan.ok) {
        return { ok: false, reason: 'unsupported', from, to, message: plan.message }
      }
      try {
        return await canvasEncode(asBytes(input), from, to, mime, plan.quality)
      } catch (e) {
        const message = e instanceof Error ? e.message : `Could not convert ${from} to ${to}.`
        return { ok: false, reason: 'invalid', from, to, code: 'decode-failed', message }
      }
    },
  }
}

for (const from of RASTER_FORMATS) {
  for (const to of RASTER_FORMATS) {
    if (from === to) continue
    registerConverter(makeConverter(from, to))
  }
}
registerConverter(makeConverter('svg', 'png'))
