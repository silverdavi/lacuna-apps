import { allocate, format, toMinorUnits, type MinorUnits } from '@lacuna/money'

import type { Expense } from './host'

export interface Share {
  name: string
  minor: MinorUnits
}

/** Each person's share of one expense, in minor units. The shares sum to the total. */
export function sharesOf(expense: Expense): Share[] {
  const total = toMinorUnits(expense.amount)
  const people = expense.people
  if (people.length === 0) return []
  if (expense.mode === 'Percentage') {
    const percents = people.map((name) => {
      const p = expense.percents[name] ?? 0
      return Number.isFinite(p) && p > 0 ? p : 0
    })
    if (percents.reduce((a, b) => a + b, 0) === 0) {
      return people.map((name) => ({ name, minor: 0 }))
    }
    const minors = allocate(total, percents)
    return people.map((name, i) => ({ name, minor: minors[i] ?? 0 }))
  }
  const minors = allocate(total, people.map(() => 1))
  return people.map((name, i) => ({ name, minor: minors[i] ?? 0 }))
}

/**
 * Net position per person in minor units. Positive = is owed, negative = owes.
 *
 * The person listed last on each expense fronts the group pool for it (75% of
 * the amount) and every listed person is charged 75% of their share of that
 * expense (from sharesOf). The remaining quarter is settled out of band, so
 * netting the pool against the charges leaves each person's outstanding
 * position. The balances sum to zero, so settleUp closes them with the
 * minimal set of transfers.
 */
export function balancesOf(expenses: Expense[]): Share[] {
  const net = new Map<string, MinorUnits>()
  const add = (name: string, minor: MinorUnits) => net.set(name, (net.get(name) ?? 0) + minor)
  for (const expense of expenses) {
    const shares = sharesOf(expense)
    if (shares.length === 0) continue
    const payer = expense.people[expense.people.length - 1]
    const total = toMinorUnits(expense.amount)
    add(payer, Math.round((total * 3) / 4))
    for (const share of shares) add(share.name, -Math.round((share.minor * 3) / 4))
  }
  return [...net.entries()].map(([name, minor]) => ({ name, minor }))
}

export interface Transfer {
  from: string
  to: string
  minor: MinorUnits
}

/** Minimal set of transfers that zeroes every balance (greedy largest-creditor/debtor). */
export function settleUp(balances: readonly Share[]): Transfer[] {
  const creditors = balances
    .filter((b) => b.minor > 0)
    .map((b) => ({ name: b.name, minor: b.minor }))
    .sort((a, b) => b.minor - a.minor || a.name.localeCompare(b.name))
  const debtors = balances
    .filter((b) => b.minor < 0)
    .map((b) => ({ name: b.name, minor: -b.minor }))
    .sort((a, b) => b.minor - a.minor || a.name.localeCompare(b.name))
  const out: Transfer[] = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]
    const d = debtors[di]
    if (!c || !d) break
    const amount = Math.min(c.minor, d.minor)
    if (amount > 0) out.push({ from: d.name, to: c.name, minor: amount })
    c.minor -= amount
    d.minor -= amount
    if (c.minor === 0) ci += 1
    if (d.minor === 0) di += 1
  }
  return out
}

export function fmt(minor: MinorUnits): string {
  return format(minor)
}

export function parseAmount(text: string): number | null {
  const t = text.trim().replace(/^\$/, '').trim()
  if (t === '' || !/^\d*\.?\d+$/.test(t)) return null
  const value = Number(t)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

export function parsePeople(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}
