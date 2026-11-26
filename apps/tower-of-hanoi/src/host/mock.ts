// Mock persistence for the development shell: localStorage-backed, no network.
// Mirrors the surface the real @lacuna/host provides for play:game + save:score.
const BEST_KEY = 'lacuna.tower-of-hanoi.best'
const DISKS_KEY = 'lacuna.tower-of-hanoi.disks'

export interface ScoreRecord {
  best: number
  disks: number
}

const clampDisks = (value: unknown): number => {
  const n = typeof value === 'number' ? Math.trunc(value) : NaN
  return Number.isInteger(n) && n >= 3 && n <= 8 ? n : 3
}

const clampBest = (value: unknown): number => {
  const n = typeof value === 'number' ? Math.trunc(value) : NaN
  return Number.isInteger(n) && n >= 0 ? n : 0
}

export const mockStore = {
  readRecord(): ScoreRecord {
    try {
      const best = clampBest(Number(localStorage.getItem(BEST_KEY)))
      const disks = clampDisks(Number(localStorage.getItem(DISKS_KEY)))
      return { best, disks }
    } catch {
      return { best: 0, disks: 3 }
    }
  },
  writeRecord(record: ScoreRecord) {
    try {
      localStorage.setItem(BEST_KEY, String(clampBest(record.best)))
      localStorage.setItem(DISKS_KEY, String(clampDisks(record.disks)))
    } catch {
      // storage unavailable; the score lives for this session only
    }
  },
}
