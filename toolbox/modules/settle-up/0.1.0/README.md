<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components settleUp at 6188248. -->

> `@lacuna/settle-up` `0.1.0`. To use it in an app: add `"@lacuna/settle-up": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/settle-up": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/settle-up'`.

# settleUp

Pure functions that take a set of shared expenses and compute each participant's net balance, then produce a minimal set of who-pays-whom transfers that settle all balances. Splits are equal per expense, rounded to whole minor units with the largest-remainder method from `@lacuna/money`, so shares always sum exactly to the expense amount. Used by Bill Splitter and Tip Calculator style apps that need to resolve who owes whom after a group expense.

## Signature

```ts
export interface Expense {
  id: string;
  description: string;
  /** Total amount in minor units (e.g. cents). Must be > 0. */
  amount: number;
  /** IDs of participants who split this expense equally. */
  participants: readonly string[];
  /** ID of the participant who paid the full amount. */
  paidBy: string;
}

export interface Balance {
  participantId: string;
  /** Net amount in minor units. Positive: owed; negative: owes. */
  amount: number;
}

export interface Transfer {
  from: string;
  to: string;
  /** Amount in minor units. Always > 0. */
  amount: number;
}

export interface SettlementResult {
  balances: readonly Balance[];
  transfers: readonly Transfer[];
}

export function settleExpenses(expenses: readonly Expense[]): SettlementResult;
export function formatSettleAmount(amount: number, currency: string): string;
```

## Usage

```tsx
import { settleExpenses, formatSettleAmount } from '@lacuna/settle-up';

const result = settleExpenses([
  { id: 'e1', description: 'Dinner', amount: 1000, participants: ['alice', 'bob'], paidBy: 'alice' },
]);
const bob = result.balances.find((b) => b.participantId === 'bob');
console.log(formatSettleAmount(bob ? bob.amount : 0, 'USD'));
console.log(result.transfers);
```
