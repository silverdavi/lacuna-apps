import { useState } from 'react'
import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Rail,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { host, type BudgetEntry, type EntryType } from './host'

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
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    setEntries(host.addEntry(desc, type, parsed))
    setDescription('')
    setAmount('')
    setType('income')
  }

  const onDelete = (id: string) => {
    setEntries(host.deleteEntry(id))
  }

  return (
    <AppShell
      name="Budget Planner"
      icon="grid"
      hue="green"
      category="productivity"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status="Saved on this device"
      side={<Rail title="Budget Planner" note="One month · local" chips={['Income', 'Expenses', 'Works offline']} />}
    >
      <Card mono="New" title="Add an entry">
        <FormGrid>
          <TextInput label="Description" value={description} onChange={setDescription} error={error} />
          <TextInput label="Amount" value={amount} onChange={setAmount} inputMode="decimal" type="number" />
          <Select
            label="Type"
            value={type}
            onChange={(value) => setType(value as EntryType)}
            options={[
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Expense' },
            ]}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={onAdd}>Add entry</Button>
        </Actions>
      </Card>

      <Card mono="Summary" title="Month">
        <Body>Income: {usd.format(income)}</Body>
        <Body>Expenses: {usd.format(expenses)}</Body>
        <Body>Balance: {usd.format(balance)}</Body>
      </Card>

      <Card mono={`${entries.length} saved`} title="Entries">
        {entries.length === 0 ? (
          <EmptyState mono="Empty" title="No entries yet" detail="Add the first one above." />
        ) : (
          <List label="Entries">
            {entries.map((entry) => (
              <Row
                key={entry.id}
                title={entry.description}
                value={formatSigned(entry.amount, entry.type)}
                action={
                  <Button kind="ghost" ariaLabel={`Delete ${entry.description}`} onClick={() => onDelete(entry.id)}>
                    Delete {entry.description}
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
