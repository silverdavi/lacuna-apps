import { prefs, type Prefs } from './mock'

export type { Prefs }

export function getPrefs(): Prefs {
  return prefs.get()
}

export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...prefs.get(), ...patch }
  prefs.set(next)
  return next
}
