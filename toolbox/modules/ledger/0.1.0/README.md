<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ledger at 27329c5. -->

> `@lacuna/ledger` `0.1.0`. To use it in an app: add `"@lacuna/ledger": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/ledger": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/ledger'`.

# ledger

Pure functions for a double-entry-style transaction ledger. It manages accounts (assets, liabilities, income, expense), categories with optional monthly budgets, and transactions in integer minor units, then derives per-account balances, running balances, net worth (assets minus liabilities), budget-versus-actuals for a month, and category-filtered transaction lists. Everything is immutable and free of any UI, network, or date-library dependencies, so finance apps can track money movement and compare planned versus actual spending without side effects.

## Signature

```ts
export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'income' | 'expense';
}

export interface Category {
  id: string;
  name: string;
  budget?: number; // minor units, monthly
}

export interface Transaction {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  accountId: string;
  categoryId: string;
  amount: number; // minor units; positive = inflow, negative = outflow
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

export function createLedger(accounts: Account[], categories: Category[]): Ledger;
export function addTransaction(ledger: Ledger, tx: Omit<Transaction, 'id'>): Ledger;
export function removeTransaction(ledger: Ledger, txId: string): Ledger;
export function getBalance(ledger: Ledger, accountId: string, asOf?: string): number;
export function getRunningBalance(ledger: Ledger, accountId: string, from?: string, to?: string): BalanceEntry[];
export function getNetWorth(ledger: Ledger, asOf?: string): number;
export function getBudgetActuals(ledger: Ledger, year: number, month: number): BudgetActual[];
export function getTransactionsByCategory(ledger: Ledger, categoryId: string, from?: string, to?: string): Transaction[];
```

## Usage

```tsx
import { createLedger, addTransaction, getNetWorth, getBudgetActuals } from '@lacuna/ledger';

let ledger = createLedger([{ id: 'a1', name: 'Cash', type: 'asset' }], [{ id: 'c1', name: 'Food', budget: 5000 }]);
ledger = addTransaction(ledger, { date: '2024-03-10', accountId: 'a1', categoryId: 'c1', amount: -3200 });
const worth = getNetWorth(ledger);
const actuals = getBudgetActuals(ledger, 2024, 3);
console.log(worth, actuals[0]?.remaining);
```
