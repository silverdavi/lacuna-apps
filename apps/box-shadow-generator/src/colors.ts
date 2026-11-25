// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.

export function toRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  const [r, g, b] = normalized.match(/[0-9a-f]{2}/gi)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0]
  return { r: r ?? 0, g: g ?? 0, b: b ?? 0 }
}

export function shadowColor(r: number, g: number, b: number, alpha: number): string {
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
