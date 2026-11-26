import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
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
    <AppShell
      name="Subscription Tracker"
      icon="bills"
      hue="green"
      category="Productivity"
      meta={`${subscriptions.length} ${subscriptions.length === 1 ? 'subscription' : 'subscriptions'}`}
      status="Saved on this device"
      side={
        <Rail
          title="Subscription Tracker"
          note="Recurring bills · local"
          chips={['Monthly', 'Works offline']}
        >
          <Body>Total monthly: {formatCost(total)}</Body>
        </Rail>
      }
    >
      <Stack lg>
        <Card mono="New" title="Add a subscription">
          <FormGrid>
            <TextInput label="Name" value={name} onChange={setName} />
            <Select label="Category" value={category} onChange={setCategory} options={CATEGORIES} />
            <TextInput label="Monthly cost" value={cost} onChange={setCost} inputMode="decimal" />
          </FormGrid>
          {error && (
            <div className="sub-error" role="alert">
              {error}
            </div>
          )}
          <Actions>
            <Button kind="primary" onClick={onAdd}>
              Add subscription
            </Button>
          </Actions>
        </Card>

        <Card mono={`${subscriptions.length} ${subscriptions.length === 1 ? 'bill' : 'bills'}`} title="Subscriptions">
          {subscriptions.length === 0 ? (
            <EmptyState mono="Empty" title="No subscriptions yet" detail="Add your first one above." />
          ) : (
            <Table
              label="Subscriptions"
              columns={[
                {
                  key: 'name',
                  label: (
                    <button type="button" className="sub-sort" onClick={() => onSort('name')}>
                      Name{arrow('name')}
                    </button>
                  ),
                },
                { key: 'category', label: 'Category' },
                {
                  key: 'cost',
                  num: true,
                  label: (
                    <button type="button" className="sub-sort sub-sort-num" onClick={() => onSort('cost')}>
                      Monthly cost{arrow('cost')}
                    </button>
                  ),
                },
                { key: 'action', label: '' },
              ]}
              rows={visible.map((s) => ({
                cells: {
                  name: s.name,
                  category: s.category,
                  cost: formatCost(s.cost),
                  action: (
                    <Button kind="ghost" onClick={() => onDelete(s.id)}>
                      Delete {s.name}
                    </Button>
                  ),
                },
              }))}
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
