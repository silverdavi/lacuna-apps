// Local persistence for this app. In the sandbox the host record API replaces this file; the
// shape stays the same. Everything is fictional or user-typed (team names), never real personal data.
import { EMPTY_STATS, type Stats } from '../deck'

export type Mode = 'solo' | 'quizmaster'

export interface Settings {
  /** Selected category indexes; null means all. */
  cats: number[] | null
  tiers: number[]
  size: number
  mode: Mode
  teamCount: number
}

export interface Saved {
  settings: Settings
  recent: number[]
  ever: number[]
  stats: Stats
  daily: Record<string, 'got' | 'miss'>
  teams: string[]
}

export const DEFAULT_TEAMS = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6', 'Team 7', 'Team 8']

export const DEFAULTS: Saved = {
  settings: { cats: null, tiers: [1, 2, 3], size: 10, mode: 'solo', teamCount: 0 },
  recent: [],
  ever: [],
  stats: EMPTY_STATS,
  daily: {},
  teams: DEFAULT_TEAMS,
}

const KEY = 'lacuna.pub-trivia.v1'

const ints = (v: unknown, max = 100000): number[] =>
  Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < max) : []

export function sanitize(raw: unknown): Saved {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Saved, any>>
  const s = r.settings ?? {}
  const d = DEFAULTS.settings
  const tiers = ints(s.tiers, 4).filter((t) => t >= 1)
  const daily: Saved['daily'] = {}
  if (r.daily && typeof r.daily === 'object') {
    for (const [k, v] of Object.entries(r.daily)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && (v === 'got' || v === 'miss')) daily[k] = v
  }
  const byCat: Stats['byCat'] = {}
  if (r.stats?.byCat && typeof r.stats.byCat === 'object') {
    for (const [k, v] of Object.entries(r.stats.byCat as Record<string, unknown>)) {
      if (Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1])) byCat[k] = [Number(v[0]), Number(v[1])]
    }
  }
  const teams = Array.isArray(r.teams) ? r.teams.map((t: unknown) => String(t).slice(0, 24)) : []
  return {
    settings: {
      cats: s.cats === null || s.cats === undefined ? null : ints(s.cats, 1000),
      tiers: tiers.length ? tiers : d.tiers,
      size: [10, 20, 50, 0].includes(s.size) ? s.size : d.size,
      mode: s.mode === 'quizmaster' ? 'quizmaster' : 'solo',
      teamCount: Number.isInteger(s.teamCount) && s.teamCount >= 0 && s.teamCount <= 8 ? s.teamCount : 0,
    },
    recent: ints(r.recent).slice(-500),
    ever: ints(r.ever),
    stats: { answered: Number(r.stats?.answered) || 0, correct: Number(r.stats?.correct) || 0, byCat },
    daily,
    teams: DEFAULT_TEAMS.map((t, i) => teams[i] || t),
  }
}

export const mockStore = {
  read(): Saved {
    try {
      const raw = localStorage.getItem(KEY)
      return sanitize(raw ? JSON.parse(raw) : null)
    } catch {
      return sanitize(null)
    }
  },
  write(saved: Saved) {
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {
      // storage unavailable; state lives for this session only
    }
  },
}
