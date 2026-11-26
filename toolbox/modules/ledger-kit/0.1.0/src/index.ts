// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/ledger-kit 0.1.0: snapshot of lacuna-components LedgerKit at 9c2e4b7 by sync-toolbox-components.py; a change gets a new version.
import type { ReactNode } from 'react'

export interface Transaction {
  id: string
  date: string
  amount: number
  categoryId: string
  note: string
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
}

export interface LedgerKitProps {
  /** Initial transactions to load. */
  initialTransactions?: Transaction[]
  /** Initial categories. */
  initialCategories?: Category[]
  /** Initial budgets keyed by category id. */
  initialBudgets?: Record<string, number>
  /** Currency code for display (e.g. 'USD'). Default 'USD'. */
  currency?: string
  /** Whether to show the budget section. Default true. */
  showBudgets?: boolean
  /** Whether to show the chart section. Default true. */
  showCharts?: boolean
  /** Callback fired when transactions change. */
  onChange?: (
    transactions: Transaction[],
    categories: Category[],
    budgets: Record<string, number>,
  ) => void
  /** Optional wrapper content rendered after the main sections. */
  children?: ReactNode
}

export { LedgerKit } from './LedgerKit'
