// Space-scoped persistence for the savings goal tracker, backed by @lacuna/host-mock.
// The app keeps every goal and deposit in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Deposit = {
  id: string
  amount: number // dollars
  date: string // YYYY-MM-DD
  createdAt: number
}

export type Goal = {
  id: string
  name: string
  target: number // dollars
  deadline: string // YYYY-MM-DD
  deposits: Deposit[]
  createdAt: number
}

export type SavingsState = {
  goals: Goal[]
}

export const emptyState = (): SavingsState => ({ goals: [] })

export const KEY = 'lacuna.savings-goal.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `g-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isDeposit(value: unknown): value is Deposit {
  const d = value as Deposit
  return (
    d != null &&
    typeof d === 'object' &&
    typeof d.amount === 'number' &&
    Number.isFinite(d.amount) &&
    d.amount > 0 &&
    typeof d.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.date)
  )
}

function isGoal(value: unknown): value is Goal {
  const g = value as Goal
  return (
    g != null &&
    typeof g === 'object' &&
    typeof g.name === 'string' &&
    g.name.trim().length > 0 &&
    typeof g.target === 'number' &&
    Number.isFinite(g.target) &&
    g.target > 0 &&
    typeof g.deadline === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(g.deadline) &&
    Array.isArray(g.deposits) &&
    g.deposits.every(isDeposit)
  )
}

const store = createMockRecordStore<Goal>({
  key: KEY,
  idPrefix: 'g-',
  validate: isGoal,
})

export function loadState(): SavingsState {
  const goals = store
    .list()
    .map((g) => ({
      id: g.id,
      name: g.name,
      target: g.target,
      deadline: g.deadline,
      deposits: [...g.deposits].sort(
        (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt,
      ),
      createdAt: Number.isFinite(g.createdAt) ? g.createdAt : 0,
    }))
  return { goals }
}

export function saveState(state: SavingsState): void {
  store.replaceAll(state.goals)
}

export function savedOf(goal: Goal): number {
  return goal.deposits.reduce((sum, d) => sum + d.amount, 0)
}

export function percentOf(goal: Goal): number {
  return goal.target > 0 ? Math.round((savedOf(goal) / goal.target) * 100) : 0
}

export function money(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
