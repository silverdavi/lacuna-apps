// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import type { ShadowSettings } from './App'

export interface ShadowPreset {
  name: string
  settings: ShadowSettings
}

export interface NamedPreset {
  value: string
  label: string
  hint: string
  settings: ShadowSettings
}

const HEX = String.fromCharCode(35)

export const presetOptions: NamedPreset[] = [
  {
    value: 'subtle',
    label: 'Subtle',
    hint: 'Cards and list rows that need presence without weight.',
    settings: { x: '0', y: '1', blur: '2', spread: '0', opacity: '10', hex: `${HEX}000000` },
  },
  {
    value: 'default',
    label: 'Default',
    hint: 'The working default: a clean drop shadow at full strength.',
    settings: { x: '0', y: '4', blur: '12', spread: '0', opacity: '100', hex: `${HEX}000000` },
  },
  {
    value: 'elevated',
    label: 'Elevated',
    hint: 'Modals, popovers, and anything floating above the page.',
    settings: { x: '0', y: '8', blur: '24', spread: '-4', opacity: '40', hex: `${HEX}000000` },
  },
  {
    value: 'glow',
    label: 'Colored glow',
    hint: 'Focus rings and highlighted states using a tinted shadow.',
    settings: { x: '0', y: '0', blur: '16', spread: '2', opacity: '60', hex: `${HEX}2563eb` },
  },
]
