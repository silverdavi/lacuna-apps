// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser. Seed rows are fictional.
import { createMockRecordStore } from '@lacuna/host-mock'
import type { AnniversaryType } from '../anniversaries'
import type { Where } from '../holidays'

export type Tab = 'Today' | 'Convert' | 'Calendar' | 'Anniversaries' | 'Year'
export const TABS: Tab[] = ['Today', 'Convert', 'Calendar', 'Anniversaries', 'Year']

export type Anniversary = {
  id: string
  label: string
  type: AnniversaryType
  year: number
  month: number
  day: number
  /** Yahrzeit in a common-year Adar: observe in Adar II in leap years. */
  adarII: boolean
}

const TYPES: AnniversaryType[] = ['birthday', 'yahrzeit', 'bar-mitzvah', 'bat-mitzvah']

const validate = (value: unknown): value is Anniversary => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<Anniversary>
  return typeof v.label === 'string'
    && TYPES.includes(v.type as AnniversaryType)
    && Number.isInteger(v.year) && Number.isInteger(v.month) && Number.isInteger(v.day)
    && typeof v.adarII === 'boolean'
}

export const STORAGE_KEY = 'lacuna.hebrew-calendar:anniversaries'
const SETTINGS_KEY = 'lacuna.hebrew-calendar:settings'
const SEEDED_KEY = 'lacuna.hebrew-calendar:seeded'

export function anniversaryStore() {
  const store = createMockRecordStore<Anniversary>({ key: STORAGE_KEY, idPrefix: 'an', validate })
  let seeded = false
  try {
    seeded = localStorage.getItem(SEEDED_KEY) === '1'
  } catch {
    seeded = false
  }
  if (!seeded) {
    // Fictional examples so the list is not empty on first open.
    if (store.list().length === 0) {
      store.add({ label: 'Sample birthday', type: 'birthday', year: 5760, month: 9, day: 17, adarII: false })
      store.add({ label: 'Sample yahrzeit', type: 'yahrzeit', year: 5781, month: 12, day: 14, adarII: false })
      store.add({ label: 'Sample bar mitzvah', type: 'bar-mitzvah', year: 5774, month: 8, day: 30, adarII: false })
    }
    try {
      localStorage.setItem(SEEDED_KEY, '1')
    } catch {
      // storage unavailable; the seeds live for this session only
    }
  }
  return store
}

export type Settings = { tab: Tab; where: Where }
const DEFAULTS: Settings = { tab: 'Today', where: 'diaspora' }

export const settings = {
  read(): Settings {
    try {
      const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<Settings> | null
      return {
        tab: raw && TABS.includes(raw.tab as Tab) ? (raw.tab as Tab) : DEFAULTS.tab,
        where: raw && (raw.where === 'israel' || raw.where === 'diaspora') ? raw.where : DEFAULTS.where,
      }
    } catch {
      return DEFAULTS
    }
  },
  write(value: Settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
    } catch {
      // storage unavailable; settings last for this session
    }
  },
}
