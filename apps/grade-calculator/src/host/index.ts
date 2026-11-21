// Space-scoped persistence for the grade calculator.
// The app keeps every component in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.

export type GradeComponent = {
  id: string
  name: string
  score: number // 0..100
  weight: number // percentage, may be any non-negative number
  createdAt: number
}

export type GradeState = {
  components: GradeComponent[]
}

export const emptyState = (): GradeState => ({ components: [] })

const KEY = 'lacuna.grade-calculator.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `g-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function loadState(): GradeState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.components)) return emptyState()
    const components = parsed.components
      .filter(
        (c: unknown) =>
          c &&
          typeof c === 'object' &&
          typeof (c as GradeComponent).name === 'string' &&
          (c as GradeComponent).name.trim() !== '' &&
          Number.isFinite((c as GradeComponent).score) &&
          (c as GradeComponent).score >= 0 &&
          (c as GradeComponent).score <= 100 &&
          Number.isFinite((c as GradeComponent).weight) &&
          (c as GradeComponent).weight >= 0,
      )
      .map((c: GradeComponent) => ({
        id: typeof c.id === 'string' && c.id ? c.id : makeId(),
        name: c.name,
        score: c.score,
        weight: c.weight,
        createdAt: Number.isFinite(c.createdAt) ? c.createdAt : 0,
      }))
    return { components }
  } catch {
    return emptyState()
  }
}

export function saveState(state: GradeState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}

export { KEY }
