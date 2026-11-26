// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/settle-up 0.1.0: snapshot of lacuna-components settleUp at 6188248 by sync-toolbox-components.py; a change gets a new version.
import { add, allocate, fromMinorUnits, sub } from '@lacuna/money'

/**
 * A single expense shared among participants.
 */
export interface Expense {
  /** Unique identifier for the expense. */
  id: string;
  /** Description of the expense. */
  description: string;
  /** Total amount in minor units (e.g. cents). Must be > 0. */
  amount: number;
  /** IDs of participants who split this expense equally. */
  participants: readonly string[];
  /** ID of the participant who paid the full amount. */
  paidBy: string;
}

/**
 * Net balance for a single participant.
 * Positive means they are owed money; negative means they owe money.
 */
export interface Balance {
  participantId: string;
  /** Net amount in minor units. */
  amount: number;
}

/**
 * A single transfer in the settlement plan.
 */
export interface Transfer {
  from: string;
  to: string;
  /** Amount in minor units. Always > 0. */
  amount: number;
}

/**
 * Result of settling a set of expenses.
 */
export interface SettlementResult {
  /** Net balance per participant. */
  balances: readonly Balance[];
  /** Minimal set of transfers that zeroes all balances. */
  transfers: readonly Transfer[];
}

/**
 * Compute net balances and a minimal transfer plan for a set of expenses.
 *
 * @param expenses - Array of shared expenses.
 * @returns SettlementResult with balances and transfers.
 * @throws If an expense has an empty participants list, a non-positive amount,
 *         or a paidBy that is not in participants.
 */
export function settleExpenses(expenses: readonly Expense[]): SettlementResult {
  const balances = new Map<string, number>();

  for (const expense of expenses) {
    const { id, amount, participants, paidBy } = expense;
    if (participants.length === 0) {
      throw new Error(`Expense ${id}: participants must not be empty`);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`Expense ${id}: amount must be a positive number of minor units`);
    }
    if (!participants.includes(paidBy)) {
      throw new Error(`Expense ${id}: paidBy must be one of the participants`);
    }

    const shares = allocate(amount, participants.map(() => 1));
    for (let i = 0; i < participants.length; i++) {
      const participantId = participants[i];
      if (participantId === undefined) continue;
      const share = shares[i] ?? 0;
      const current = balances.get(participantId) ?? 0;
      balances.set(participantId, sub(current, share));
    }
    const paid = balances.get(paidBy) ?? 0;
    balances.set(paidBy, add(paid, amount));
  }

  const balanceList: Balance[] = [...balances.entries()]
    .map(([participantId, value]) => ({ participantId, amount: value }))
    .sort((a, b) => (a.participantId < b.participantId ? -1 : a.participantId > b.participantId ? 1 : 0));

  const creditors = balanceList
    .filter((b) => b.amount > 0)
    .map((b) => ({ id: b.participantId, remaining: b.amount }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = balanceList
    .filter((b) => b.amount < 0)
    .map((b) => ({ id: b.participantId, remaining: -b.amount }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    if (creditor === undefined || debtor === undefined) break;
    const amount = Math.min(creditor.remaining, debtor.remaining);
    if (amount > 0) {
      transfers.push({ from: debtor.id, to: creditor.id, amount });
    }
    creditor.remaining -= amount;
    debtor.remaining -= amount;
    if (creditor.remaining === 0) ci += 1;
    if (debtor.remaining === 0) di += 1;
  }

  return { balances: balanceList, transfers };
}

/**
 * Format a minor-unit amount as a display string.
 */
export function formatSettleAmount(amount: number, currency: string): string {
  const major = fromMinorUnits(amount, currency);
  const sign = major < 0 ? '-' : '';
  const formatted = Math.abs(major).toFixed(2);
  return `${sign}$${formatted}`;
}
