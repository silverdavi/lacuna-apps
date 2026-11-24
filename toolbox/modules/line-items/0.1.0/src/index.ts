// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/line-items 0.1.0: snapshot of lacuna-components lineItems at d422a73 by sync-toolbox-components.py; a change gets a new version.
import { mul, roundMinor, sub, format } from '@lacuna/money';

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

function assertFinite(value: number, field: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid ${field}: expected a finite number, got ${String(value)}`);
  }
}

function validateItem(item: LineItem): void {
  assertFinite(item.quantity, 'quantity');
  if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
    throw new Error(`Invalid quantity: must be a positive integer, got ${item.quantity}`);
  }
  assertFinite(item.unitPrice, 'unitPrice');
  if (item.unitPrice < 0) {
    throw new Error(`Invalid unitPrice: must be >= 0, got ${item.unitPrice}`);
  }
  assertFinite(item.discount, 'discount');
  if (item.discount < 0 || item.discount > 1) {
    throw new Error(`Invalid discount: must be between 0 and 1, got ${item.discount}`);
  }
  assertFinite(item.taxRate, 'taxRate');
  if (item.taxRate < 0) {
    throw new Error(`Invalid taxRate: must be >= 0, got ${item.taxRate}`);
  }
}

export function computeLineItem(item: LineItem): LineItemResult {
  validateItem(item);
  const extended = mul(item.unitPrice, item.quantity);
  const discountAmount = roundMinor(extended * item.discount, 'half-up');
  const net = sub(extended, discountAmount);
  const taxAmount = roundMinor(net * item.taxRate, 'half-up');
  return {
    extended,
    discountAmount,
    net,
    taxAmount,
    total: net + taxAmount,
  };
}

export function computeOrderTotals(items: readonly LineItem[]): OrderTotals {
  let subtotal = 0;
  let totalDiscount = 0;
  let netTotal = 0;
  let totalTax = 0;
  let grandTotal = 0;
  for (const item of items) {
    const result = computeLineItem(item);
    subtotal += result.extended;
    totalDiscount += result.discountAmount;
    netTotal += result.net;
    totalTax += result.taxAmount;
    grandTotal += result.total;
  }
  return { subtotal, totalDiscount, netTotal, totalTax, grandTotal };
}

export function formatMinorUnits(amount: number, currency: string): string {
  assertFinite(amount, 'amount');
  return format(Math.trunc(amount), { currency });
}
