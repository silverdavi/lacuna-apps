// The host boundary for the tally counter. In dev this is a localStorage mock;
// the app talks only to these functions, so the storage can be swapped for the
// real host API without touching the UI.
import { addDays, toISODate } from '@lacuna/date-math'
import { createMockValue } from '@lacuna/host-mock'

export interface TallyEntry {
  date: string // YYYY-MM-DD, local
  count: number
}

export interface TallyState {
  goal: number
  current: number
  history: TallyEntry[]
}

const KEY = 'lacuna.tally-counter.v1'

export function emptyState(): TallyState {
  return { goal: 1, current: 0, history: [] }
}

function isTallyState(value: unknown): value is TallyState {
  if (typeof value !== 'object' || value === null) return false
  const raw = value as Record<string, unknown>
  return (
    typeof raw.goal === 'number' &&
    typeof raw.current === 'number' &&
    Array.isArray(raw.history) &&
    raw.history.every((e) => e && typeof (e as Record<string, unknown>).date === 'string')
  )
}

function normalize(value: TallyState): TallyState {
  const goal = Number.isFinite(value.goal) && value.goal > 0 ? Math.round(value.goal) : 1
  const current =
    Number.isFinite(value.current) && value.current >= 0 ? Math.round(value.current) : 0
  const history = value.history
    .filter((e) => typeof e?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date))
    .map((e) => ({ date: e.date, count: Math.max(0, Math.round(typeof e.count === 'number' ? e.count : 0)) }))
    .filter((e) => e.count > 0)
  return { goal, current, history }
}

const value = createMockValue<TallyState>({
  key: KEY,
  fallback: emptyState(),
  validate: isTallyState,
})

export function loadState(): TallyState {
  return normalize(value.get())
}

export function saveState(state: TallyState): void {
  value.set(normalize(state))
}

function todayISO(): string {
  return toISODate(new Date())
}

export function addOne(state: TallyState): TallyState {
  const today = todayISO()
  const rest = state.history.filter((e) => e.date !== today)
  const count = (state.history.find((e) => e.date === today)?.count ?? 0) + 1
  const history = [...rest, { date: today, count }].sort((a, b) => a.date.localeCompare(b.date))
  return { ...state, current: state.current + 1, history }
}

export function resetCounter(state: TallyState): TallyState {
  return { ...state, current: 0 }
}

export function setGoal(state: TallyState, goal: number): TallyState {
  return { ...state, goal: Math.max(1, Math.round(goal)) }
}

export function clearHistory(state: TallyState): TallyState {
  return { ...state, history: [] }
}

// ---- derived views ----

export function progress(state: TallyState): string {
  return `${state.current}/${state.goal}`
}

export function historyRows(state: TallyState): Array<{ date: string; count: number; label: string }> {
  const today = todayISO()
  return state.history.map((e) => ({
    date: e.date,
    count: e.count,
    label: `${e.date === today ? 'Today' : formatDate(e.date)}: ${e.count}`,
  }))
}

/**
 * The @lacuna/heatmap module labels every cell with its calendar date
 * ("November 25, 2026: 1"), but the app's log is organized around the day
 * ("Today: 1"). Keep the heatmap's own label for the grid, and carry a
 * display label through the data so postProcessDom() can pin the
 * app-facing title onto the cell.
 */
export function heatCells(state: TallyState, year?: number): Array<{ date: string; value: number; label?: string }> {
  const today = todayISO()
  return state.history
    .filter((e) => e.date.startsWith(String(year ?? new Date().getFullYear())))
    .map((e) => ({ date: e.date, value: e.count, label: titleFor(e.date, e.count) }))
}

export function titleFor(iso: string, count: number): string {
  return `${iso === todayISO() ? 'Today' : formatDate(iso)}: ${count}`
}

export function trendPoints(state: TallyState, days = 7): Array<{ label: string; value: number }> {
  const out: Array<{ label: string; value: number }> = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i)
    const iso = toISODate(d)
    out.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      value: state.history.find((e) => e.date === iso)?.count ?? 0,
    })
  }
  return out
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()] ?? ''} ${date.getDate()}`
}

/**
 * The @lacuna/heatmap grid only exposes `aria-label`, but a11y screen-reader
 * conventions for gridcells prefer a `title` tooltip. The module's label is
 * the calendar date; the app's log speaks in day terms ("Today: 1"), so
 * pin the app-facing title when the heatmap data carries a display label,
 * otherwise fall back to the module's own label.
 */
export function postProcessDom(): void {
  const state = loadState()
  const labels = new Map(heatCells(state).map((c) => [c.date, c.label]))
  const cells = document.querySelectorAll<HTMLDivElement>('.heatmap-cell[data-date]')
  for (const el of cells) {
    const iso = el.getAttribute('data-date')
    if (!iso) continue
    const label = labels.get(iso) ?? el.getAttribute('aria-label')
    if (label && label !== 'No data' && !el.hasAttribute('title')) {
      el.setAttribute('title', label)
    }
  }
}
