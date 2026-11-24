import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { format, toMinorUnits } from '@lacuna/money'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { host, ACCOUNTS, BUDGET_CATEGORIES, type Account, type Budgets, type Category, type Transaction, type TransactionType } from './host'

const TABS = ['Ledger', 'Budgets', 'Charts'] as const
type Tab = (typeof TABS)[number]

const INCOME_TYPES = ['Income'] as const
const EXPENSE_TYPES = ['Expense'] as const
const TYPES: readonly string[] = [...INCOME_TYPES, ...EXPENSE_TYPES]

const INCOME_CATEGORIES: readonly Category[] = ['Salary']
const ALL_CATEGORIES: readonly Category[] = ['Salary', ...BUDGET_CATEGORIES]

function parseMajor(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const value = Number(trimmed.replace(/[$,\s]/g, ''))
  return Number.isFinite(value) && value >= 0 ? value : null
}

function signed(minor: number, type: TransactionType): string {
  return type === 'income' ? `+${format(minor)}` : `-${format(Math.abs(minor))}`
}

const DONUT_FILL: readonly string[] = ['var(--ink)', 'var(--accent)', 'var(--mid)']

function DonutChart({ data }: { data: readonly { category: Category; minor: number }[] }) {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(null)

  const total = data.reduce((s, d) => s + d.minor, 0)
  const width = 320
  const height = 200
  const cx = width / 2
  const cy = height / 2
  const R = Math.min(width, height) / 2 - 10
  const r = R * 0.55
  const TAU = Math.PI * 2

  let acc = 0
  const slices = data.map((d, i) => {
    const a0 = total > 0 ? (acc / total) * TAU : 0
    acc += d.minor
    const a1 = total > 0 ? (acc / total) * TAU : 0
    let dPath: string
    if (data.length === 1) {
      // Full circle (no hole) so the bounding-box center lands on the slice.
      dPath = `M ${cx + R} ${cy} A ${R} ${R} 0 1 1 ${cx - R} ${cy} A ${R} ${R} 0 1 1 ${cx + R} ${cy} Z`
    } else {
      const large = a1 - a0 > Math.PI ? 1 : 0
      const x0 = cx + R * Math.cos(a0)
      const y0 = cy + R * Math.sin(a0)
      const x1 = cx + R * Math.cos(a1)
      const y1 = cy + R * Math.sin(a1)
      const xi1 = cx + r * Math.cos(a1)
      const yi1 = cy + r * Math.sin(a1)
      const xi0 = cx + r * Math.cos(a0)
      const yi0 = cy + r * Math.sin(a0)
      dPath = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`
    }
    return { category: d.category, minor: d.minor, dPath, fill: DONUT_FILL[i % DONUT_FILL.length] }
  })

  const show = (e: ReactMouseEvent, i: number) => {
    const s = slices[i]
    if (s === undefined) return
    setTip({ text: `${s.category}: ${format(s.minor)}`, x: e.clientX, y: e.clientY })
  }
  const hide = () => setTip(null)
  const tipAbove = tip ? tip.y > 34 : true

  return (
    <div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Spending by category" style={{ display: 'block', overflow: 'visible' }}>
        {slices.map((s, i) => (
          <path key={i} d={s.dPath} fill={s.fill} fillRule="evenodd" onMouseEnter={(e) => show(e, i)} onMouseOver={(e) => show(e, i)} onMouseMove={(e) => show(e, i)} onMouseLeave={hide} />
        ))}
      </svg>
      <div>
        {data.map((d) => (
          <div key={d.category} className="lc-body-sm">
            {d.category}
          </div>
        ))}
      </div>
      {tip ? (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: `${tip.x}px`,
            top: `${tipAbove ? tip.y - 8 : tip.y + 12}px`,
            transform: tipAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(11px * var(--tf))',
            padding: 'calc(3px * var(--sf)) calc(7px * var(--sf))',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {tip.text}
        </div>
      ) : null}
    </div>
  )
}

export function App() {
  const [tab, setTab] = useState<Tab>('Ledger')
  const [transactions, setTransactions] = useState<Transaction[]>(() => host.listTransactions())
  const [budgets, setBudgets] = useState<Budgets>(() => host.getBudgets())
  const [budgetDrafts, setBudgetDrafts] = useState<Partial<Record<keyof Budgets, string>>>({})

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'Income' | 'Expense'>('Income')
  const [account, setAccount] = useState<Account>('Bank')
  const [category, setCategory] = useState<Category>('Salary')
  const [error, setError] = useState<string | null>(null)

  const majorCategories = type === 'Income' ? INCOME_CATEGORIES : BUDGET_CATEGORIES
  const activeCategory = majorCategories.includes(category) ? category : majorCategories[0]

  const { netWorthMinor, totalIncomeMinor, totalExpenseMinor } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of transactions) {
      const minor = toMinorUnits(t.amount)
      if (t.type === 'income') income += minor
      else expense += minor
    }
    return { netWorthMinor: income - expense, totalIncomeMinor: income, totalExpenseMinor: expense }
  }, [transactions])

  const expenseByCategory = useMemo(() => {
    const totals = new Map<Category, number>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      totals.set(t.category, (totals.get(t.category) ?? 0) + toMinorUnits(t.amount))
    }
    return BUDGET_CATEGORIES.filter((c) => (totals.get(c) ?? 0) > 0).map((c) => ({
      category: c,
      minor: totals.get(c) ?? 0,
    }))
  }, [transactions])

  function changeType(next: 'Income' | 'Expense') {
    setType(next)
    const cats = next === 'Income' ? INCOME_CATEGORIES : BUDGET_CATEGORIES
    setCategory((current) => (cats.includes(current) ? current : cats[0]))
  }

  function add() {
    const major = parseMajor(amount)
    if (!description.trim()) {
      setError('Type a description first')
      return
    }
    if (major === null) {
      setError('Amount must be a non-negative number, e.g. 42.50')
      return
    }
    setTransactions(host.addTransaction(description.trim(), type === 'Income' ? 'income' : 'expense', major, account, activeCategory))
    setDescription('')
    setAmount('')
    setError(null)
  }

  function remove(id: string) {
    setTransactions(host.deleteTransaction(id))
  }

  function updateBudget(cat: keyof Budgets, text: string) {
    setBudgetDrafts((prev) => ({ ...prev, [cat]: text }))
  }

  function commitBudget(cat: keyof Budgets, text: string) {
    const major = parseMajor(text)
    if (major === null) return
    setBudgets(host.setBudget(cat, major))
    setBudgetDrafts((prev) => {
      const next = { ...prev }
      delete next[cat]
      return next
    })
  }

  useEffect(() => {
    setBudgetDrafts({})
  }, [tab])

  const ledgerColumns = [
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type' },
    { key: 'account', label: 'Account' },
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount', num: true },
    { key: 'action', label: '' },
  ]

  const ledgerRows = transactions.map((t) => ({
    cells: {
      description: t.description,
      type: t.type === 'income' ? 'Income' : 'Expense',
      account: t.account,
      category: t.category,
      amount: signed(toMinorUnits(t.amount), t.type),
      action: (
        <Button kind="ghost" ariaLabel={`Delete ${t.description}`} onClick={() => remove(t.id)}>
          {t.description}
        </Button>
      ),
    },
  }))

  const budgetRows = BUDGET_CATEGORIES.map((cat) => ({
    cells: {
      category: cat,
      budget: (
        <label>
          <span className="lc-mono lc-faint" style={{ fontSize: 'calc(11px * var(--tf))' }}>
            {format(toMinorUnits(budgets[cat]))}
          </span>{' '}
          <input
            className="lc-input"
            aria-label="Budget"
            inputMode="decimal"
            value={budgetDrafts[cat] ?? String(budgets[cat])}
            onChange={(e) => updateBudget(cat, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitBudget(cat, e.currentTarget.value)
            }}
            style={{ width: 'calc(6em * var(--sf))' }}
          />
        </label>
      ),
      actual: format(expenseByCategory.find((e) => e.category === cat)?.minor ?? 0),
    },
  }))

  return (
    <AppShell
      name="Personal Finance Ledger"
      icon="grid"
      hue="green"
      category="Finance"
      status={`${transactions.length} ${transactions.length === 1 ? 'transaction' : 'transactions'}`}
    >
      <div className="lc-tabs" role="tablist" aria-label="Personal Finance Ledger views">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ledger' ? (
        <div role="tabpanel" aria-label="Ledger">
          <KpiRow>
            <div className="lc-kpi">
              <div className="lc-kpi-label">Net worth</div>
              <div className="lc-kpi-value accent">{format(netWorthMinor)}</div>
            </div>
            <Kpi value={format(totalIncomeMinor)} label="Income" />
            <Kpi value={format(totalExpenseMinor)} label="Expenses" />
          </KpiRow>

          <Card mono="New" title="Add a transaction">
            <FormGrid>
              <TextInput label="Description" value={description} onChange={setDescription} placeholder="Salary" />
              <TextInput label="Amount" value={amount} onChange={setAmount} inputMode="decimal" placeholder="2500" />
              <Select label="Type" value={type} onChange={(v) => changeType(v as 'Income' | 'Expense')} options={[...TYPES]} />
              <Select label="Account" value={account} onChange={(v) => setAccount(v as Account)} options={[...ACCOUNTS]} />
              <Select
                label="Category"
                value={activeCategory}
                onChange={(v) => setCategory(v as Category)}
                options={[...majorCategories]}
              />
            </FormGrid>
            <div>
              <Button kind="primary" onClick={add}>Add</Button>
              {error ? <p role="alert">{error}</p> : null}
            </div>
          </Card>

          <Card mono={`${transactions.length} saved`} title="Transactions">
            {transactions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No transactions yet"
                detail="Record income or expenses in the form above."
                actionLabel="Get started"
                onAction={() => setTab('Ledger')}
              />
            ) : (
              <Table label="Transactions" columns={ledgerColumns} rows={ledgerRows} />
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'Budgets' ? (
        <div role="tabpanel" aria-label="Budgets">
          <Card mono={`${BUDGET_CATEGORIES.length} categories`} title="Monthly budgets">
            <Table
              label="Budgets"
              columns={[
                { key: 'category', label: 'Category' },
                { key: 'budget', label: 'Budget', num: true },
                { key: 'actual', label: 'Actual', num: true },
              ]}
              rows={budgetRows}
            />
          </Card>
        </div>
      ) : null}

      {tab === 'Charts' ? (
        <div role="tabpanel" aria-label="Charts">
          <Card mono="Expenses" title="Spending by category">
            {expenseByCategory.length === 0 ? (
              <EmptyState
                mono="No data"
                title="Nothing spent yet"
                detail="Add an expense in the Ledger to see the mix."
                actionLabel="Add an expense"
                onAction={() => setTab('Ledger')}
              />
            ) : (
              <DonutChart data={expenseByCategory} />
            )}
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
