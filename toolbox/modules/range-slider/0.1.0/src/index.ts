// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/range-slider 0.1.0: snapshot of lacuna-components RangeSlider at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
// Includes logic adapted from the open-source project credited in NOTICE.md, under its licence.
export type RangeSliderProps = {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  format?: (value: number) => string
  disabled?: boolean
}

export { RangeSlider } from './RangeSlider'
