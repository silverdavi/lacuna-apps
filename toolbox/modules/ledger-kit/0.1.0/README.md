<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components LedgerKit at 9c2e4b7. -->

> `@lacuna/ledger-kit` `0.1.0`. To use it in an app: add `"@lacuna/ledger-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/ledger-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/ledger-kit'`.

# LedgerKit

A ready-made ledger for personal-finance apps. It renders a "Ledger" heading,
an "Add Transaction" primary action, and a transactions table (via `RecordTable`).
Clicking "Add Transaction" opens a modal form with a note field, a `MoneyInput`
for the amount, and a category combobox. Saving adds a new row to the table.
Optional `showBudgets` and `showCharts` panels summarize spending by category
when enabled.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `initialTransactions` | `Transaction[]` (optional) | Transactions to display on first render. |
| `initialCategories` | `Category[]` (optional) | Categories offered in the form and used to label rows. |
| `initialBudgets` | `Record<string, number>` (optional) | Budgets keyed by category id, in minor units. |
| `currency` | `string` (optional, default `'USD'`) | ISO currency code for display. |
| `showBudgets` | `boolean` (optional, default `true`) | Show a budgets panel summarizing spend per category. |
| `showCharts` | `boolean` (optional, default `true`) | Show a spending-by-category chart panel. |
| `onChange` | `(transactions: Transaction[], categories: Category[], budgets: Record<string, number>) => void` (optional) | Callback fired when transactions change. |
| `children` | `ReactNode` (optional) | Content rendered after the main sections. |

`Transaction` is `{ id: string; date: string; amount: number; categoryId: string; note: string }`,
where `amount` is in minor units (negative values are spending).
`Category` is `{ id: string; name: string; color: string; icon?: string }`.

## Usage

```tsx
import { LedgerKit } from '@lacuna/ledger-kit'

export function Example() {
  return (
    <LedgerKit
      initialCategories={[
        { id: 'groceries', name: 'Groceries', color: 'var(--accent)', icon: '🛒' },
        { id: 'dining', name: 'Dining', color: 'var(--accent)', icon: '🍽' },
      ]}
      initialTransactions={[
        { id: 't-1', date: '2026-11-01', amount: -5000, categoryId: 'groceries', note: 'Groceries' },
      ]}
      initialBudgets={{ groceries: 50000 }}
      currency="USD"
      showBudgets
      showCharts
    />
  )
}
```
