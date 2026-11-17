// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Pure: which image pairs Convert will run. Canvas encode lives in transcode.ts.
import type { FormatId } from '@lacuna/formats'

export const RASTER_FORMATS = ['png', 'jpeg', 'webp'] as const
export type RasterFormat = (typeof RASTER_FORMATS)[number]

const RASTER = new Set<string>(RASTER_FORMATS)

export const IMAGE_OUT_MIME: Record<RasterFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export type ImageConvertPlan =
  | { ok: true; from: FormatId; to: RasterFormat; mime: string; quality?: number }
  | { ok: false; reason: 'unsupported' | 'refused'; from: FormatId; to: FormatId; message: string }

/** SVG is never an output (scripts in SVG). Raster pairs and SVG→PNG are allowed. */
export function imageConvertPlan(from: FormatId, to: FormatId): ImageConvertPlan {
  if (to === 'svg') {
    return {
      ok: false,
      reason: 'refused',
      from,
      to,
      message: 'SVG is not offered as an output format (script risk). Rasterize to PNG instead.',
    }
  }
  if (from === 'svg' && to === 'png') {
    return { ok: true, from, to: 'png', mime: IMAGE_OUT_MIME.png }
  }
  if (RASTER.has(from) && RASTER.has(to) && from !== to) {
    const raster = to as RasterFormat
    return {
      ok: true,
      from,
      to: raster,
      mime: IMAGE_OUT_MIME[raster],
      quality: raster === 'png' ? undefined : 0.92,
    }
  }
  return {
    ok: false,
    reason: 'unsupported',
    from,
    to,
    message: `No image converter registered for ${from} → ${to}.`,
  }
}
