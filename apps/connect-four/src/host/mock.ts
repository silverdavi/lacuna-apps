const KEY = 'lacuna.connect-four.score'

export type ScoreRecord = { score: number }

export const mockStore = {
  readScore(): number {
    try {
      const raw = localStorage.getItem(KEY)
      const value = raw === null ? NaN : Number(raw)
      return Number.isInteger(value) && value >= 0 ? value : 0
    } catch {
      return 0
    }
  },
  writeScore(score: number) {
    try {
      localStorage.setItem(KEY, String(score))
    } catch {
      // storage unavailable; the score lives for this session only
    }
  },
}
