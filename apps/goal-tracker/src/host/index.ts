// Space-scoped persistence for the goal tracker.
// The app keeps everything in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.

export type CheckIn = {
  date: string // YYYY-MM-DD
  count: number
  goal: number
  createdAt: number
}

export type GoalState = {
  goalName: string
  dailyGoal: number
  checkIns: CheckIn[]
}

export const emptyState = (): GoalState => ({
  goalName: 'My goal',
  dailyGoal: 1,
  checkIns: [],
})

const KEY = 'lacuna.goal-tracker.state'

export function loadState(): GoalState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyState()
    return {
      goalName: typeof parsed.goalName === 'string' && parsed.goalName.trim() ? parsed.goalName : 'My goal',
      dailyGoal: Number.isFinite(parsed.dailyGoal) && parsed.dailyGoal > 0 ? Math.floor(parsed.dailyGoal) : 1,
      checkIns: Array.isArray(parsed.checkIns)
        ? parsed.checkIns
            .filter((c: unknown) => c && typeof c === 'object' && typeof (c as CheckIn).date === 'string')
            .map((c: CheckIn) => ({
              date: c.date,
              count: Number.isFinite(c.count) ? Math.max(0, Math.floor(c.count)) : 0,
              goal: Number.isFinite(c.goal) && c.goal > 0 ? Math.floor(c.goal) : 1,
              createdAt: Number.isFinite(c.createdAt) ? c.createdAt : 0,
            }))
        : [],
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: GoalState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}
