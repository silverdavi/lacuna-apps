// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Canvas export paints with fixed data colors; they live here, not in a component.
export const SWATCHES = [
  { label: 'Black', color: 'rgb(24, 24, 24)' },
  { label: 'Red', color: 'rgb(235, 61, 49)' },
  { label: 'Rust', color: 'rgb(181, 80, 42)' },
  { label: 'Gold', color: 'rgb(201, 151, 30)' },
  { label: 'Moss', color: 'rgb(74, 122, 90)' },
  { label: 'Teal', color: 'rgb(46, 184, 166)' },
  { label: 'Indigo', color: 'rgb(74, 90, 158)' },
  { label: 'Violet', color: 'rgb(124, 111, 232)' },
] as const

export const PNG = {
  paper: 'rgb(250, 250, 250)',
  ink: 'rgb(24, 24, 24)',
} as const
