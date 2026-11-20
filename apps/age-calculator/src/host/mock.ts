export interface AgeCalculationRecord {
  birthDate: string
  referenceDate: string
  years: number
  months: number
  days: number
  totalDays: number
  weeks: number
  monthsFlattened: number
  hours: number
  savedAt: string
}

const KEY = 'lacuna.age-calculator.last'

export function loadAgeCalculation(): AgeCalculationRecord | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AgeCalculationRecord
    if (typeof parsed?.birthDate !== 'string' || typeof parsed?.years !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export function saveAgeCalculation(record: AgeCalculationRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(record))
  } catch {
    // storage is full or unavailable; the app keeps working without persistence
  }
}
