// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/color-palette 0.1.0: snapshot of lacuna-components ColorPalette at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export type Swatch = {
  name: string
  color: string
}

export type ColorPaletteProps = {
  label: string
  swatches: Swatch[]
  value: string
  onChange: (color: string) => void
  columns?: number
}

export const DEFAULT_SWATCHES: Swatch[] = [
  { name: 'Rose', color: 'hsl(348, 82%, 55%)' },
  { name: 'Coral', color: 'hsl(14, 84%, 58%)' },
  { name: 'Amber', color: 'hsl(42, 92%, 54%)' },
  { name: 'Lemon', color: 'hsl(56, 90%, 50%)' },
  { name: 'Lime', color: 'hsl(86, 74%, 44%)' },
  { name: 'Fern', color: 'hsl(142, 52%, 40%)' },
  { name: 'Teal', color: 'hsl(178, 48%, 38%)' },
  { name: 'Cyan', color: 'hsl(196, 78%, 46%)' },
  { name: 'Azure', color: 'hsl(210, 84%, 52%)' },
  { name: 'Cobalt', color: 'hsl(228, 62%, 50%)' },
  { name: 'Violet', color: 'hsl(258, 60%, 56%)' },
  { name: 'Orchid', color: 'hsl(282, 52%, 58%)' },
  { name: 'Magenta', color: 'hsl(306, 64%, 52%)' },
  { name: 'Ink', color: 'hsl(220, 14%, 16%)' },
  { name: 'Stone', color: 'hsl(220, 8%, 52%)' },
  { name: 'Paper', color: 'hsl(40, 30%, 95%)' },
]

export { ColorPalette } from './ColorPalette'
