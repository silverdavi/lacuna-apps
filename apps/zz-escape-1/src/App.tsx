import { useState } from 'react'
import { Body, Button, Stack, TextInput } from '@lacuna/ui'
import { host, type BudgetEntry, type EntryType } from './host'
import './app.css'

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatSigned(amount: number, type: EntryType): string {
  return `${type === 'income' ? '+' : '-'}${usd.format(amount)}`
}

export function App() {
  const [entries, setEntries] = useState<BudgetEntry[]>(() => host.loadEntries())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<EntryType>('income')
  const [error, setError] = useState('')

  const income = entries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const expenses = entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const balance = income - expenses

  const onAdd = () => {
    const parsed = Number.parseFloat(amount)
    const desc = description.trim()
    if (!desc || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a description and an amount greater than 0')
      return
    }
    setError('')
    setEntries(host.addEntry(desc, type, parsed))
    setDescription('')
    setAmount('')
    setType('income')
  }

  const onDelete = (id: string) => {
    setEntries(host.deleteEntry(id))
  }

  return (
    <main className="budget-app">
      <h1 className="budget-heading">Budget Planner</h1>
      <Stack lg>
          <div className="budget-form">
            <TextInput label="Description" value={description} onChange={setDescription} />
            <label className="budget-field">
              <span className="budget-label">Amount</span>
              <input
                className="lc-input"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="budget-field">
              <span className="budget-label">Type</span>
              <select
                className="lc-input"
                value={type}
                onChange={(event) => setType(event.target.value as EntryType)}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>
            <Button kind="primary" onClick={onAdd}>
              Add entry
            </Button>
            {error && (
              <div className="budget-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="budget-summary">
            <Body>Income: {usd.format(income)}</Body>
            <Body>Expenses: {usd.format(expenses)}</Body>
            <Body>Balance: {usd.format(balance)}</Body>
          </div>

          {entries.length === 0 ? (
            <Body>No entries yet</Body>
          ) : (
            <ul className="budget-list">
              {entries.map((entry) => (
                <li key={entry.id} className="budget-item">
                  <span className="budget-item-desc">{entry.description}</span>
                  <span className={`budget-item-amount ${entry.type}`}>
                    {formatSigned(entry.amount, entry.type)}
                  </span>
                  <Button kind="ghost" onClick={() => onDelete(entry.id)}>
                    Delete {entry.description}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Stack>
    </main>
  )
}
