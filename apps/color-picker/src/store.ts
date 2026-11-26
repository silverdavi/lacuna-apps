// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/app-color-picker: local record store for the current color and saved palette.
import { useLocalRecord } from '@lacuna/use-local-record'
import type { Rgb } from './colors'

export const STORAGE_KEY = 'color-picker.v1'

export interface PickerState {
  r: number
  g: number
  b: number
  palette: string[]
}

interface Options {
  defaultRgb: Rgb
}

export function useColorStore({ defaultRgb }: Options) {
  return useLocalRecord<PickerState>({
    key: STORAGE_KEY,
    version: 1,
    defaultValue: { r: defaultRgb.r, g: defaultRgb.g, b: defaultRgb.b, palette: [] },
  })
}
