// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  KpiRow,
  Kpi,
  PrimaryButton,
  Rail,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'

interface ReceiptData {
  merchant: string
  amount: number
  category: string
}

const CATEGORIES = ['Food', 'Office', 'Transport', 'Housing', 'Health', 'Other']

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

export function App() {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [amountError, setAmountError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { state, actions } = useCollection<ReceiptData>({
    storageKey: 'lacuna.receipt-tracker:receipts',
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return state.activeItems.filter(
      (item) =>
        (!q || item.data.merchant.toLowerCase().includes(q)) &&
        (!category || item.data.category === category),
    )
  }, [state.activeItems, search, category])

  const total = useMemo(() => rows.reduce((sum, item) => sum + item.data.amount, 0), [rows])

  function add() {
    const value = Number.parseFloat(amount)
    if (amount.trim() === '' || Number.isNaN(value) || value <= 0) {
      setAmountError('Amount is required')
      return
    }
    if (!merchant.trim()) return
    actions.add({ merchant: merchant.trim(), amount: value, category: category || 'Other' })
    setMerchant('')
    setAmount('')
    setCategory('')
    setAmountError(null)
  }

  function exportCsv() {
    const text = toCsv([
      ['Merchant', 'Category', 'Amount'],
      ...rows.map((item) => [item.data.merchant, item.data.category, item.data.amount.toFixed(2)]),
    ])
    saveText(text, { filename: 'receipts.csv', mimeType: 'text/csv' })
  }

  const columns = [
    { key: 'merchant', label: 'Merchant' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', num: true },
    { key: 'actions', label: '' },
  ]

  return (
    <AppShell
      name="Receipt Tracker"
      icon="timesheets"
      hue="teal"
      category="Finance"
      meta={`${state.activeItems.length} receipt${state.activeItems.length === 1 ? '' : 's'}`}
      side={
        <Rail
          title="Summary"
          chips={['CSV', 'Filter', 'Search']}
          note={`${rows.length} of ${state.activeItems.length} receipts shown`}
        >
          <KpiRow>
            <Kpi value={String(rows.length)} label="Shown" />
            <Kpi value={String(state.activeItems.length)} label="All" />
          </KpiRow>
          <Stack>
            <Select
              label="Category"
              value={category}
              onChange={setCategory}
              options={[
                { value: '', label: 'All' },
                ...CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
            <TextInput
              label="Search"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Find a merchant"
            />
            <Button kind="ghost" onClick={exportCsv}>Export CSV</Button>
          </Stack>
        </Rail>
      }
    >
      <Stack>
        <Card mono="New" title="Add a receipt">
          <FormGrid>
            <TextInput
              label="Merchant"
              value={merchant}
              onChange={setMerchant}
              placeholder="Where did you pay?"
            />
            <TextInput
              label="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              error={amountError}
            />
          </FormGrid>
          <PrimaryButton onClick={add}>Add receipt</PrimaryButton>
        </Card>

        <Card mono={`${rows.length} shown`} title="Receipts">
          {state.activeItems.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No receipts yet"
              detail="Add your first receipt above."
              actionLabel="Add a receipt"
              onAction={add}
            />
          ) : (
            <>
              <Table
                label="Receipts"
                columns={columns}
                rows={rows.map((item) => ({
                  cells: {
                    merchant: item.data.merchant,
                    category: item.data.category,
                    amount: rows.length > 1 ? formatMoney(item.data.amount) : item.data.amount.toFixed(2),
                    actions: (
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${item.data.merchant}`}
                        onClick={() => actions.remove(item.id)}
                      >
                        Delete
                      </Button>
                    ),
                  },
                }))}
                empty="No receipts match"
              />
              <p role="status">Total: {formatMoney(total)}</p>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
