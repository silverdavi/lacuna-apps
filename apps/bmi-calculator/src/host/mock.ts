// Space-scoped persistence for the BMI calculator.
// The last calculation is kept in the space's mock storage (localStorage) so
// the app works offline. State is rehydrated on load and saved on every
// calculation.

export type Units = 'metric' | 'imperial'

export type BmiRecord = {
  units: Units
  height: string
  weight: string
  bmi: number
  at: number
} | null

const KEY = 'lacuna.bmi-calculator.last'

export function loadLast(): BmiRecord {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const units: Units = parsed.units === 'imperial' ? 'imperial' : 'metric'
    const height = typeof parsed.height === 'string' ? parsed.height : ''
    const weight = typeof parsed.weight === 'string' ? parsed.weight : ''
    const bmi = typeof parsed.bmi === 'number' && Number.isFinite(parsed.bmi) ? parsed.bmi : null
    if (bmi === null || height === '' || weight === '') return null
    return { units, height, weight, bmi, at: typeof parsed.at === 'number' ? parsed.at : 0 }
  } catch {
    return null
  }
}

export function saveLast(record: BmiRecord): void {
  try {
    if (record === null) {
      window.localStorage.removeItem(KEY)
      return
    }
    window.localStorage.setItem(KEY, JSON.stringify(record))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}
