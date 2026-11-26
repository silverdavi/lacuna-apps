// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/ledger-kit 0.1.0: snapshot of lacuna-components LedgerKit at 9c2e4b7 by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useState, type ReactElement } from 'react'
import type { CSSProperties } from 'react'
import {
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  SectionLabel,
  TextInput,
} from '@lacuna/ui'
import { RecordTable } from '@lacuna/record-table'
import type { ColumnDef } from '@lacuna/record-table'
import { MoneyInput } from '@lacuna/money-input'
import { Combobox } from '@lacuna/combobox'
import type { ComboboxOption } from '@lacuna/combobox'
import { Chart } from '@lacuna/chart'
import type { Transaction, Category, LedgerKitProps } from './index'

const LOCALE = 'en-US'

const primaryBtnStyle: CSSProperties = {
  appearance: 'none',
  border: 'none',
  background: 'var(--ink)',
  color: 'var(--paper)',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  fontWeight: 600,
  padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
  borderRadius: 'calc(2px * var(--sf))',
  cursor: 'pointer',
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(24px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const panelRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'calc(16px * var(--sf))',
  flexWrap: 'wrap',
  alignItems: 'flex-start',
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 'calc(24px * var(--tf))',
  fontWeight: 500,
  color: 'var(--ink)',
  margin: 0,
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtMoney(minorUnits: number): string {
  const sign = minorUnits < 0 ? '-' : ''
  return `${sign}${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(minorUnits) / 100)}`
}

export function LedgerKit(props: LedgerKitProps): ReactElement {
  const {
    initialTransactions = [],
    initialCategories = [],
    initialBudgets,
    currency = 'USD',
    showBudgets = true,
    showCharts = true,
    onChange,
    children,
  } = props

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [budgets, setBudgets] = useState<Record<string, number>>(initialBudgets ?? {})
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState(0)
  const [category, setCategory] = useState(initialCategories[0]?.id ?? '')


  const categoryById = useMemo(() => {
    const map = new Map<string, Category>()
    for (const c of initialCategories) map.set(c.id, c)
    return map
  }, [initialCategories])

  const spentByCategory = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of transactions) {
      if (t.amount < 0) {
        totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) - t.amount)
      }
    }
    return totals
  }, [transactions])

  const totalSpent = useMemo(
    () => transactions.reduce((s, t) => (t.amount < 0 ? s - t.amount : s), 0),
    [transactions],
  )

  const columns: ColumnDef<Record<string, unknown>>[] = [
    { key: 'date', header: 'Date' },
    { key: 'note', header: 'Note' },
    {
      key: 'categoryId',
      header: 'Category',
      formatter: (_v, record) => {
        const c = categoryById.get(String(record.categoryId))
        return c ? c.name : '—'
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      formatter: (v) => fmtMoney(Number(v)),
    },
  ]

  const chartData = useMemo(
    () =>
      initialCategories
        .map((c) => ({ label: c.name, value: spentByCategory.get(c.id) ?? 0 }))
        .filter((p) => p.value > 0),
    [initialCategories, spentByCategory],
  )

  const categoryOptions: ComboboxOption[] = useMemo(
    () => initialCategories.map((c) => ({ value: c.id, label: c.name })),
    [initialCategories],
  )

  function mutate(
    updater: (t: Transaction[], b: Record<string, number>) => [Transaction[], Record<string, number>],
  ): void {
    const next = updater(transactions, budgets)
    setTransactions(next[0])
    setBudgets(next[1])
    onChange?.(next[0], initialCategories, next[1])
  }

  function openDialog(): void {
    setNote('')
    setAmount(0)
    setCategory(initialCategories[0]?.id ?? '')
    setOpen(true)
  }

  function saveTransaction(): void {
    if (!note.trim() || !category) return
    mutate((prevT, prevB) => [
      [
        ...prevT,
        {
          id: `t-${Date.now()}`,
          date: today(),
          amount,
          categoryId: category,
          note: note.trim(),
        },
      ],
      prevB,
    ])
    setOpen(false)
  }



  return (
    <div style={wrapStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--sf))', flexWrap: 'wrap' }}>
        <h1 style={headingStyle}>Ledger</h1>
        <button type="button" style={primaryBtnStyle} onClick={openDialog}>Add Transaction</button>
      </div>

      <Card mono="Ledger" title="Transactions">
        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions yet"
            detail="Add your first transaction to start tracking."
            actionLabel="Press Add Transaction"
            onAction={openDialog}
          />
        ) : (
          <RecordTable
            records={transactions as unknown as Record<string, unknown>[]}
            columns={columns}
            rowKey={(r) => String(r.id)}
            ariaLabel="Transactions"
          />
        )}
      </Card>

      {(showBudgets || showCharts) && (
        <div style={panelRowStyle}>
          {showBudgets && (
            <Card mono="Budgets" title="Spending by category" style={{ flex: 1, minWidth: 'calc(260px * var(--sf))' }}>
              {initialCategories.length === 0 ? (
                <div style={{ color: 'var(--ink-60)' }}>No categories</div>
              ) : (
                initialCategories.map((c) => {
                  const spent = spentByCategory.get(c.id) ?? 0
                  const budget = budgets[c.id]
                  return (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'calc(8px * var(--sf))',
                        padding: 'calc(8px * var(--sf)) 0',
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                      }}
                    >
                      <span aria-hidden="true">{c.icon}</span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))' }}>
                        {fmtMoney(spent)}
                        {budget !== undefined ? ` / ${fmtMoney(budget)}` : ''}
                      </span>
                    </div>
                  )
                })
              )}
            </Card>
          )}
          {showCharts && (
            <Card mono="Charts" title="Spending by category" style={{ flex: 1, minWidth: 'calc(260px * var(--sf))' }}>
              {chartData.length === 0 ? (
                <div style={{ color: 'var(--ink-60)' }}>No spending yet</div>
              ) : (
                <Chart type="bar" data={chartData} title="Spending by category" ariaLabel="Spending by category" />
              )}
            </Card>
          )}
        </div>
      )}

      <KpiRow>
        <Kpi value={fmtMoney(totalSpent)} label="Total spent" accent />
        <Kpi value={String(transactions.length)} label="Transactions" />
      </KpiRow>

      {children}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Transaction"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--dim-veil)',
          }}
        >
          <div
            style={{
              width: 'calc(420px * var(--sf))',
              maxWidth: 'calc(100% * var(--sf))',
              margin: 'calc(20px * var(--sf))',
              background: 'var(--paper)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: 'calc(2px * var(--sf))',
              padding: 'calc(20px * var(--sf))',
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(16px * var(--sf))',
            }}
          >
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 'calc(18px * var(--tf))', fontWeight: 500, color: 'var(--ink)', margin: 0 }}>
              Add Transaction
            </h3>
            <TextInput label="Note" value={note} onChange={setNote} placeholder="What did you spend on?" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--sf))' }}>
              <SectionLabel>Amount</SectionLabel>
              <MoneyInput value={amount} onChange={setAmount} currency={currency} locale={LOCALE} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--sf))' }}>
              <SectionLabel>Category</SectionLabel>
              {initialCategories.length > 0 ? (
                <Combobox
                  label="Category"
                  options={categoryOptions}
                  value={category || null}
                  onChange={(v) => setCategory(v ?? '')}
                  placeholder="Pick a category"
                />
              ) : (
                <div style={{ color: 'var(--ink-60)' }}>No categories available</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'calc(8px * var(--sf))' }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  appearance: 'none',
                  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                  background: 'var(--paper)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(13px * var(--tf))',
                  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                  borderRadius: 'calc(2px * var(--sf))',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button type="button" style={primaryBtnStyle} onClick={saveTransaction}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
