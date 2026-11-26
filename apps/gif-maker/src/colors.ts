// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Data colors for the sample-frame preview canvases. The design lint skips this file.

export const GIF_FRAME_STYLES: [number, number, number][] = [
  [220, 30, 30],
  [30, 200, 40],
  [40, 60, 230],
]

export const GIF_LABEL_RGB = 'rgb(255, 255, 255)'

export function frameFill(rgb: [number, number, number]): string {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}
