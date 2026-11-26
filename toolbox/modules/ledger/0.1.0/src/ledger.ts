// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/ledger 0.1.0: snapshot of lacuna-components ledger at 27329c5 by sync-toolbox-components.py; a change gets a new version.
export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'income' | 'expense';
}

export interface Category {
  id: string;
  name: string;
  budget?: number;
}

export interface Transaction {
  id: string;
  date: string;
  accountId: string;
  categoryId: string;
  amount: number;
  memo?: string;
}

export interface BalanceEntry {
  date: string;
  balance: number;
}

export interface BudgetActual {
  categoryId: string;
  budget: number;
  actual: number;
  remaining: number;
}

export interface Ledger {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}

function nextId(ledger: Ledger): string {
  let highest = 0;
  for (const tx of ledger.transactions) {
    const m = /^tx-(\d+)$/.exec(tx.id);
    if (m !== null && m[1] !== undefined) {
      const n = Number(m[1]);
      if (n > highest) highest = n;
    }
  }
  return `tx-${highest + 1}`;
}

function inRange(date: string, from?: string, to?: string): boolean {
  if (from !== undefined && date < from) return false;
  if (to !== undefined && date > to) return false;
  return true;
}

export function createLedger(accounts: Account[], categories: Category[]): Ledger {
  return {
    accounts: [...accounts],
    categories: [...categories],
    transactions: [],
  };
}

export function addTransaction(ledger: Ledger, tx: Omit<Transaction, 'id'>): Ledger {
  const transaction: Transaction = { ...tx, id: nextId(ledger) };
  return {
    ...ledger,
    transactions: [...ledger.transactions, transaction],
  };
}

export function removeTransaction(ledger: Ledger, txId: string): Ledger {
  const transactions = ledger.transactions.filter((t) => t.id !== txId);
  return {
    ...ledger,
    transactions,
  };
}

export function getBalance(ledger: Ledger, accountId: string, asOf?: string): number {
  return ledger.transactions
    .filter((tx) => tx.accountId === accountId && (asOf === undefined || tx.date <= asOf))
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function getRunningBalance(
  ledger: Ledger,
  accountId: string,
  from?: string,
  to?: string,
): BalanceEntry[] {
  const base = ledger.transactions
    .filter((tx) => tx.accountId === accountId && from !== undefined && tx.date < from)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totals = new Map<string, number>();
  for (const tx of ledger.transactions) {
    if (tx.accountId !== accountId || !inRange(tx.date, from, to)) continue;
    totals.set(tx.date, (totals.get(tx.date) ?? 0) + tx.amount);
  }
  const entries: BalanceEntry[] = [];
  let running = base;
  for (const date of [...totals.keys()].sort()) {
    const dayAmount = totals.get(date);
    if (dayAmount !== undefined) running += dayAmount;
    entries.push({ date, balance: running });
  }
  return entries;
}

export function getNetWorth(ledger: Ledger, asOf?: string): number {
  return ledger.accounts
    .filter((account) => account.type === 'asset' || account.type === 'liability')
    .reduce((sum, account) => sum + getBalance(ledger, account.id, asOf), 0);
}

export function getBudgetActuals(ledger: Ledger, year: number, month: number): BudgetActual[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const results: BudgetActual[] = [];
  for (const category of ledger.categories) {
    if (category.budget === undefined) continue;
    const budget = category.budget;
    const spent = ledger.transactions
      .filter((tx) => tx.categoryId === category.id && tx.date.startsWith(prefix) && tx.amount < 0)
      .reduce((sum, tx) => sum - tx.amount, 0);
    results.push({
      categoryId: category.id,
      budget,
      actual: spent,
      remaining: budget - spent,
    });
  }
  return results;
}

export function getTransactionsByCategory(
  ledger: Ledger,
  categoryId: string,
  from?: string,
  to?: string,
): Transaction[] {
  return ledger.transactions.filter(
    (tx) => tx.categoryId === categoryId && inRange(tx.date, from, to),
  );
}
