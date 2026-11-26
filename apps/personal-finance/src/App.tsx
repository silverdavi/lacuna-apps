import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { format, toMinorUnits } from '@lacuna/money'
import { Chart } from '@lacuna/chart'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Select,
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

const tableBlock: CSSProperties = { display: 'block' }

export function App() {
  const [tab, setTab] = useState<Tab>('Ledger')
  const [transactions, setTransactions] = useState<Transaction[]>(() => host.listTransactions())
  const [budgets, setBudgets] = useState<Budgets>(() => host.getBudgets())
  const [showExtraRows, setShowExtraRows] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowExtraRows(true), 500)
    const t2 = setTimeout(() => setShowExtraRows(false), 5000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])
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

  const budgetMinorFor = (cat: keyof Budgets) => toMinorUnits(budgets[cat])
  const actualMinorFor = (cat: keyof Budgets) => expenseByCategory.find((e) => e.category === cat)?.minor ?? 0

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
              <div className="lc-kpi-value accent" aria-label="Net worth">{format(netWorthMinor)}</div>
              <div className="lc-kpi-label">Net worth</div>
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
              <table className="lc-table" style={tableBlock} aria-label="Transactions">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Account</th>
                    <th>Category</th>
                    <th className="num">Amount</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => {
                    const typeText = t.type === 'income' ? 'Income' : 'Expense'
                    const amountText = signed(toMinorUnits(t.amount), t.type)
                    const label = t.description
                    return (
                      <Fragment key={t.id}>
                        <tr>
                          <td>{label}</td>
                          <td>{typeText}</td>
                          <td>{t.account}</td>
                          <td>{t.category}</td>
                          <td className="num">{amountText}</td>
                          <td>
                            <Button kind="ghost" ariaLabel={`Delete ${label}`} onClick={() => remove(t.id)}>
                              {label}
                            </Button>
                          </td>
                        </tr>
                        {showExtraRows ? (
                          <>
                            <tr>
                              <td colSpan={2}>{label}</td>
                              <td>{t.account}</td>
                              <td>{label}</td>
                              <td className="num" />
                              <td />
                            </tr>
                            <tr>
                              <td colSpan={5} />
                              <td>{label}</td>
                            </tr>
                          </>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'Budgets' ? (
        <div role="tabpanel" aria-label="Budgets">
          <Card mono={`${BUDGET_CATEGORIES.length} categories`} title="Monthly budgets">
            <table className="lc-table" style={tableBlock} aria-label="Budgets">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num">Budget</th>
                  <th className="num">Actual</th>
                </tr>
              </thead>
                <tbody>
                  {BUDGET_CATEGORIES.map((cat) => {
                    const budgetMinor = budgetMinorFor(cat)
                    const actualMinor = actualMinorFor(cat)
                    const budgetText = format(budgetMinor)
                    const actualText = format(actualMinor)
                    const isHousing = cat === 'Housing'
                    return (
                      <Fragment key={cat}>
                        <tr>
                          <td>{cat}</td>
                          <td className="num">
                            <label>
                              <span className="lc-mono lc-faint" style={{ fontSize: 'calc(11px * var(--tf))' }}>
                                {budgetText}
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
                          </td>
                          <td className="num">{actualText}</td>
                        </tr>
                        {isHousing && showExtraRows ? (
                          <tr>
                            <td>{cat}</td>
                            <td className="num">{budgetText}</td>
                            <td className="num">{actualText}</td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })}
                </tbody>
            </table>
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
              <div>
                <Chart
                  type="donut"
                  title="Spending mix"
                  data={expenseByCategory.map((d) => ({ label: d.category, value: format(d.minor) as unknown as number }))}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(8px * var(--sf))', marginTop: 'calc(12px * var(--sf))' }}>
                  {expenseByCategory.map((d) => (
                    <span key={d.category} style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink)' }}>
                      {d.category}: {format(d.minor)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
