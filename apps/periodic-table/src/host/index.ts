import { prefs, searches, type Prefs, type Search } from './mock'

export type { Prefs, Search }

export function getPrefs(): Prefs {
  return prefs.get()
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...prefs.get(), ...patch }
  prefs.set(next)
  return next
}

export function addSearch(entry: Omit<Search, 'id'>): void {
  const existing = searches.list().find((s) => s.symbol === entry.symbol)
  if (existing) {
    searches.update(existing.id, entry)
  } else {
    searches.add(entry)
  }
}

export function listSearches(): Search[] {
  return searches.list().sort((a, b) => b.at - a.at).slice(0, 8)
}
