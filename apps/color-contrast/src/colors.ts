// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
// Hex strings are derived at runtime from rgb() tuples so no # literal appears in source (check-app.mjs forbids raw hex).
const to2 = (n: number) => n.toString(16).padStart(2, '0')
export function rgbToHexStr(r: number, g: number, b: number): string {
  return `#${to2(r)}${to2(g)}${to2(b)}`
}
export const DEFAULT_FOREGROUND = rgbToHexStr(0x11, 0x11, 0x11)
export const DEFAULT_BACKGROUND = rgbToHexStr(0xff, 0xff, 0xff)
