import { useMemo, useState } from 'react'
import { Body, Button, Stack, TextInput } from '@lacuna/ui'
import { host, type Subscription } from './host'
import './app.css'

const CATEGORIES = ['Streaming', 'Music', 'Software', 'Gaming', 'Other']

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function formatCost(cost: number): string {
  return usd.format(Math.round(cost * 100) / 100)
}

type SortKey = 'name' | 'cost'

export function App() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => host.loadSubscriptions())
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Streaming')
  const [cost, setCost] = useState('')
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState<SortKey | null>(null)

  const total = useMemo(
    () => Math.round(subscriptions.reduce((sum, s) => sum + s.cost, 0) * 100) / 100,
    [subscriptions],
  )

  const visible = useMemo(() => {
    if (!sortKey) return subscriptions
    const copy = [...subscriptions]
    copy.sort((a, b) =>
      sortKey === 'name' ? a.name.localeCompare(b.name) : b.cost - a.cost,
    )
    return copy
  }, [subscriptions, sortKey])

  const onAdd = () => {
    const parsed = Number.parseFloat(cost)
    const trimmed = name.trim()
    if (!trimmed || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a name and a cost greater than 0')
      return
    }
    setError('')
    setSubscriptions(host.addSubscription(trimmed, category, Math.round(parsed * 100) / 100))
    setName('')
    setCost('')
  }

  const onDelete = (id: string) => {
    setSubscriptions(host.deleteSubscription(id))
  }

  const onSort = (key: SortKey) => {
    setSortKey(key)
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (key === 'name' ? ' \u2191' : ' \u2193') : ''

  return (
    <main className="sub-app">
      <h1 className="sub-heading">Subscription Tracker</h1>
      <Stack lg>
        <div className="sub-form">
          <TextInput label="Name" value={name} onChange={setName} />
          <label className="sub-field">
            <span className="sub-label">Category</span>
            <select
              className="lc-input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="sub-field">
            <span className="sub-label">Monthly cost</span>
            <input
              className="lc-input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={cost}
              onChange={(event) => setCost(event.target.value)}
            />
          </label>
          <Button kind="primary" onClick={onAdd}>
            Add subscription
          </Button>
          {error && (
            <div className="sub-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="sub-summary">
          <Body>Total monthly: {formatCost(total)}</Body>
        </div>

        {subscriptions.length === 0 ? (
          <Body>No subscriptions yet</Body>
        ) : (
          <table className="lc-table sub-table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" className="sub-sort" onClick={() => onSort('name')}>
                    Name{arrow('name')}
                  </button>
                </th>
                <th scope="col">Category</th>
                <th scope="col" className="num">
                  <button type="button" className="sub-sort sub-sort-num" onClick={() => onSort('cost')}>
                    Monthly cost{arrow('cost')}
                  </button>
                </th>
                <th scope="col" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.category}</td>
                  <td className="num">{formatCost(s.cost)}</td>
                  <td className="num">
                    <Button kind="ghost" onClick={() => onDelete(s.id)}>
                      Delete {s.name}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Stack>
    </main>
  )
}
