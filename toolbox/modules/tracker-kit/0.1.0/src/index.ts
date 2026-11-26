// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tracker-kit 0.1.0: snapshot of lacuna-components TrackerKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties } from 'react'
import { TrackerKitImpl } from './TrackerKit'

export { TrackerKitImpl as TrackerKit }

export interface TrackerEntry {
  id?: string
  date: string
  value: number
  note?: string
}

export interface TrackerKitProps {
  storageKey: string
  title: string
  min?: number
  max?: number
  unit?: string
  initialEntries?: TrackerEntry[]
  style?: CSSProperties
}
