export interface DieRoll {
  count: number
  sides: number
  values: number[]
}

export interface RollRecord {
  id: string
  expression: string
  total: number
  dice: DieRoll[]
  modifiers: number[]
  at: number
}

const STORE_KEY = 'lacuna.dice-roller:last-roll'

function readRaw(): RollRecord | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RollRecord
    if (typeof parsed?.total !== 'number' || !Array.isArray(parsed?.dice)) return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(record: RollRecord): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(record))
  } catch {
    // storage unavailable; keep the record in memory only
  }
}

let memory: RollRecord | null = null

export function loadLastRoll(): RollRecord | null {
  memory = readRaw()
  return memory
}

export function saveLastRoll(record: RollRecord): void {
  memory = record
  writeRaw(record)
}
