<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components lineItems at d422a73. -->

> `@lacuna/line-items` `0.1.0`. To use it in an app: add `"@lacuna/line-items": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/line-items": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/line-items'`.

# lineItems

Pure functions that compute subtotals, discounts, tax, and grand totals for a list of line items using integer minor-unit currency math (via `@lacuna/money`). Point of Sale, Invoice Generator, and Purchase Order apps use these to display accurate per-line and order-level pricing without floating-point drift.

## Signature

```ts
import type { Money } from '@lacuna/money';

export interface LineItem {
  /** Human-readable description. */
  description: string;
  /** Quantity, must be a positive integer. */
  quantity: number;
  /** Unit price in minor units (e.g. cents). Must be >= 0. */
  unitPrice: number;
  /** Discount as a fraction 0–1 (e.g. 0.10 for 10 %). Must be >= 0 and <= 1. */
  discount: number;
  /** Tax rate as a fraction 0–1 (e.g. 0.08 for 8 %). Must be >= 0. */
  taxRate: number;
}

export interface LineItemResult {
  /** Raw extended price before discount (quantity × unitPrice). */
  extended: number;
  /** Discount amount in minor units (rounded). */
  discountAmount: number;
  /** Net price after discount (extended − discountAmount). */
  net: number;
  /** Tax amount in minor units (rounded). */
  taxAmount: number;
  /** Line total including tax (net + taxAmount). */
  total: number;
}

export interface OrderTotals {
  /** Sum of all line extended prices. */
  subtotal: number;
  /** Sum of all line discount amounts. */
  totalDiscount: number;
  /** Sum of all line net prices. */
  netTotal: number;
  /** Sum of all line tax amounts. */
  totalTax: number;
  /** Sum of all line totals. */
  grandTotal: number;
}

/**
 * Compute the pricing breakdown for a single line item.
 * Returns a LineItemResult with all values in minor units.
 */
export function computeLineItem(item: LineItem): LineItemResult;

/**
 * Compute aggregate totals for an array of line items.
 * Returns an OrderTotals with all values in minor units.
 */
export function computeOrderTotals(items: readonly LineItem[]): OrderTotals;

/**
 * Format a minor-unit amount as a display string using the money module's
 * Intl-based formatter.
 */
export function formatMinorUnits(amount: number, currency: string): string;
```

## Usage

```tsx
import { computeLineItem, computeOrderTotals, formatMinorUnits } from '@lacuna/line-items';

const line = computeLineItem({ description: 'Widget', quantity: 2, unitPrice: 1500, discount: 0.1, taxRate: 0.08 });
const totals = computeOrderTotals([
  { description: 'Widget', quantity: 2, unitPrice: 1500, discount: 0.1, taxRate: 0.08 },
  { description: 'Gadget', quantity: 1, unitPrice: 3000, discount: 0, taxRate: 0.08 },
]);
console.log(formatMinorUnits(line.total, 'USD'), formatMinorUnits(totals.grandTotal, 'USD'));
```
