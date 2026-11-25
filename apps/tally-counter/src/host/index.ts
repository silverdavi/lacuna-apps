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

export function heatCells(state: TallyState, year?: number): Array<{ date: string; value: number }> {
  const y = year ?? new Date().getFullYear()
  return state.history
    .filter((e) => e.date.startsWith(String(y)))
    .map((e) => ({ date: e.date, value: e.count }))
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

export function titleFor(iso: string, count: number): string {
  return `${iso === todayISO() ? 'Today' : formatDate(iso)}: ${count}`
}

/** Post-process the DOM to add title attributes to heatmap cells and value labels to chart bars. */
export function postProcessDom(): void {
  const state = loadState()
  const cells = document.querySelectorAll<HTMLDivElement>('.heatmap-cell[data-date]')
  for (const el of cells) {
    const iso = el.getAttribute('data-date')!
    const value = Number(el.getAttribute('data-value') || '0')
    if (value > 0 && !el.getAttribute('title')) el.setAttribute('title', titleFor(iso, value))
  }
  const svgs = document.querySelectorAll<SVGSVGElement>('svg[role="img"]')
  for (const svg of svgs) {
    const rects = svg.querySelectorAll<SVGRectElement>('rect[data-label]')
    const points = trendPoints(state)
    for (const rect of rects) {
      const label = rect.getAttribute('data-label') || ''
      const pt = points.find((p) => p.label === label)
      if (!pt) continue
      if (!rect.getAttribute('data-value')) rect.setAttribute('data-value', String(pt.value))
      const parent = rect.parentElement
      if (!parent) continue
      const existing = parent.querySelector<SVGTextElement>(`text[data-bar="${label}"]`)
      if (existing) continue
      const x = Number(rect.getAttribute('x') || '0')
      const w = Number(rect.getAttribute('width') || '0')
      const y = Number(rect.getAttribute('y') || '0')
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      text.setAttribute('x', String(x + w / 2))
      text.setAttribute('y', String(Math.max(0, y - 4)))
      text.setAttribute('text-anchor', 'middle')
      text.setAttribute('fill', 'var(--ink)')
      text.setAttribute('font-size', '10')
      text.setAttribute('font-family', 'var(--mono)')
      text.setAttribute('data-bar', label)
      text.textContent = String(pt.value)
      parent.appendChild(text)
    }
  }
}
