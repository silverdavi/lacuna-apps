import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { format as formatMoney, type MoneyOptions, type MinorUnits } from '@lacuna/money'
import { MoneyInput } from '@lacuna/money-input'
import { useClipboard } from '@lacuna/use-clipboard'
import { CATEGORIES, type Budget, type Category, type Transaction } from './host'

type TxnData = Omit<Transaction, 'id'>
type BudgetData = Omit<Budget, 'id'>

const STORAGE_TXN = 'lacuna.expense-tracker.transactions'
const STORAGE_BUDGET = 'lacuna.expense-tracker.budgets'
const CURRENCY: MoneyOptions = { currency: 'USD', locale: 'en-US' }

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function toCSV(transactions: Transaction[]): string {
  const lines = ['date,description,category,amount']
  for (const t of transactions) {
    lines.push([t.date, csvField(t.description), t.category, String(-Math.round(t.amount * 100))].join(','))
  }
  return lines.join('\n')
}

export function App() {
  const txns = useCollection<TxnData>({ storageKey: STORAGE_TXN })
  const budgets = useCollection<BudgetData>({ storageKey: STORAGE_BUDGET })

  const [tab, setTab] = useState<'Ledger' | 'Budgets'>('Ledger')
  const [description, setDescription] = useState('')
  const [amountMinor, setAmountMinor] = useState(0)
  const [category, setCategory] = useState<Category>('Food')
  const [error, setError] = useState<string | null>(null)
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({})

  const { copied, copy } = useClipboard()

  const transactions: Transaction[] = useMemo(
    () => txns.state.items.map((item) => ({ id: item.id, ...item.data })),
    [txns.state.items],
  )
  const budgetList: Budget[] = useMemo(
    () => budgets.state.items.map((item) => ({ id: item.id, ...item.data })),
    [budgets.state.items],
  )

  const totalSpent: MinorUnits = transactions.reduce<MinorUnits>((sum, t) => sum + Math.round(t.amount * 100), 0)

  const spentByCategory = useMemo(() => {
    const map = new Map<Category, number>()
    for (const t of transactions) {
      map.set(t.category, (map.get(t.category) ?? 0) + t.amount)
    }
    return map
  }, [transactions])

  const onAdd = () => {
    const desc = description.trim()
    if (!desc || amountMinor <= 0) {
      setError('Enter a description and an amount greater than 0')
      return
    }
    setError(null)
    txns.actions.add({ description: desc, category, amount: amountMinor / 100, date: '2024-01-15' })
    setDescription('')
    setAmountMinor(0)
  }

  const onExportCSV = () => {
    void copy(toCSV(transactions))
  }

  const onRemove = (id: string) => {
    txns.actions.remove(id)
  }

  const onSaveBudget = (c: Category) => {
    const raw = (budgetDrafts[c] ?? '').trim()
    if (raw === '') return
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed < 0) return
    const entry = budgetList.find((b) => b.category === c)
    if (entry) {
      budgets.actions.update(entry.id, { amount: parsed })
    } else {
      budgets.actions.add({ category: c, amount: parsed })
    }
    setBudgetDrafts((prev) => ({ ...prev, [c]: '' }))
  }

  const budgetRows = CATEGORIES.map((c: Category) => {
    const entry = budgetList.find((b) => b.category === c)
    const spent = spentByCategory.get(c) ?? 0
    const budget = entry ? entry.amount : 0
    const status = budget > 0 ? (spent <= budget ? 'Under budget' : 'Over budget') : 'No budget'
    return { c, budget, spent, status, draft: budgetDrafts[c] ?? '' }
  })

  const ledgerColumns = [
    { key: 'date', label: 'Date' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', num: true },
    { key: 'actions', label: '' },
  ]

  const ledgerRows = transactions.map((t) => ({
    cells: {
      date: t.date,
      description: t.description,
      category: t.category,
      amount: `-${formatMoney(Math.round(t.amount * 100), CURRENCY)}`,
      actions: (
        <Button kind="ghost" ariaLabel={`Delete ${t.description}`} onClick={() => onRemove(t.id)}>
          Delete {t.description}
        </Button>
      ),
    },
  }))

  const budgetColumns = [
    { key: 'category', label: 'Category' },
    { key: 'budget', label: 'Budget' },
    { key: 'spent', label: 'Spent' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '' },
  ]

  const budgetRowsOut = budgetRows.map((b) => ({
    cells: {
      category: b.c,
      budget: `Budget: ${formatMoney(Math.round(b.budget * 100), CURRENCY)}`,
      spent: `Spent: ${formatMoney(Math.round(b.spent * 100), CURRENCY)}`,
      status: b.status,
      actions: (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <TextInput
            label="Budget"
            value={b.draft}
            onChange={(v) => setBudgetDrafts((prev) => ({ ...prev, [b.c]: v }))}
            inputMode="decimal"
            type="number"
          />
          <Button kind="secondary" onClick={() => onSaveBudget(b.c)}>
            Save budget
          </Button>
        </div>
      ),
    },
  }))

  return (
    <AppShell
      name="Expense Tracker"
      icon="finance"
      hue="teal"
      category="Finance"
      meta={`${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}`}
      side={
        <Rail title="Expense Tracker" note="This month · local" chips={['Ledger', 'Budgets', 'CSV export']}>
          <KpiRow>
            <Kpi label="Total" value={`Total spent: ${formatMoney(totalSpent, CURRENCY)}`} />
            <Kpi label="Budgeted" value={`${budgetList.filter((b) => b.amount > 0).length} of ${CATEGORIES.length} categories`} />
          </KpiRow>
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist">
        {(['Ledger', 'Budgets'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            style={{ color: tab === item ? undefined : 'var(--ink-80)' }}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <Card mono="New" title="Add a transaction">
        <FormGrid>
          <div>
            <TextInput label="Description" value={description} onChange={setDescription} placeholder="Groceries, rent, fuel..." />
            {error ? <div className="lc-field-error" role="alert">{error}</div> : null}
          </div>
          <label className="lc-field">
            <span className="lc-field-label">Amount</span>
            <MoneyInput value={amountMinor} currency="USD" onChange={setAmountMinor} min={0} step={1} placeholder="0.00" />
          </label>
          <Select label="Category" value={category} onChange={(value) => setCategory(value as Category)} options={CATEGORIES} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={onAdd}>Add transaction</PrimaryButton>
          <Button kind="secondary" onClick={onExportCSV}>
            Export CSV
          </Button>
          {copied ? <span style={{ alignSelf: 'center', color: 'var(--ink-60)' }}>Copied to clipboard</span> : null}
        </Actions>
      </Card>

      {tab === 'Ledger' ? (
        <Card mono={`${transactions.length} saved`} title="Ledger">
          {transactions.length === 0 ? (
            <table aria-label="Ledger">
              <tbody>
                <tr><td style={{ color: 'var(--ink-80)' }}>No transactions yet</td></tr>
              </tbody>
            </table>
          ) : (
            <Table
              label="Ledger"
              columns={ledgerColumns}
              rows={ledgerRows}
            />
          )}
        </Card>
      ) : (
        <Card mono="Monthly" title="Budgets by category">
          <Table
            label="Budgets"
            columns={budgetColumns}
            rows={budgetRowsOut}
          />
        </Card>
      )}
    </AppShell>
  )
}
