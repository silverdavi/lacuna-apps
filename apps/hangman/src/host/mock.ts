export interface GameRecord {
  score: number
  best: number
}

const KEY = 'lacuna.hangman.record'

const FRESH: GameRecord = { score: 0, best: 0 }

function read(): GameRecord {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { ...FRESH }
    const value = JSON.parse(raw) as Partial<GameRecord>
    const score = typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : 0
    const best = typeof value.best === 'number' && Number.isFinite(value.best) ? value.best : 0
    return { score, best }
  } catch {
    return { ...FRESH }
  }
}

export function loadRecord(): GameRecord {
  return read()
}

export function saveRecord(record: GameRecord): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(record))
  } catch {
    // storage is unavailable; the round simply does not persist
  }
}
