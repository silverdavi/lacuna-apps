// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { groceryStore } from './host/mock'

type Item = {
  name: string
  quantity: number
  done: boolean
}

export function App() {
  const { state, actions } = useCollection<Item>({ storageKey: 'grocery-list' })
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    groceryStore.replaceAll(
      state.items.map((i) => ({ id: i.id, name: i.data.name, quantity: i.data.quantity, done: i.data.done })),
    )
  }, [state.items])

  const { copied, copy } = useClipboard()

  const items = state.activeItems
  const total = items.length
  const done = items.filter((i) => i.data.done).length
  const progress = `${done} of ${total} done`

  const addItem = () => {
    const n = name.trim()
    if (n === '') {
      setError('Enter an item name')
      return
    }
    const q = Math.max(1, Math.floor(Number(quantity) || 1))
    actions.add({ name: n, quantity: q, done: false })
    setName('')
    setQuantity('')
    setError(null)
  }

  const copyList = () => {
    void copy(items.map((i) => `${i.data.name} ×${i.data.quantity}`).join('\n'))
  }

  const exportCsv = () => {
    const csv = toCsv([['name', 'quantity'], ...items.map((i) => [i.data.name, String(i.data.quantity)])])
    saveText(csv, { filename: 'grocery-list.csv', mimeType: 'text/csv' })
  }

  return (
    <AppShell
      name="Grocery List"
      icon="notes"
      hue="rust"
      category="Productivity"
      status={copied ? 'Copied to clipboard' : progress}
      actions={
        <Stack style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Button ariaLabel="Copy list" onClick={copyList}>
            Copy list
          </Button>
          <Button ariaLabel="Export CSV" onClick={exportCsv}>
            Export CSV
          </Button>
        </Stack>
      }
    >
      <Stack>
        <Card mono="New" title="Add an item">
          <FormGrid>
            <TextInput
              label="Item name"
              value={name}
              onChange={(v) => {
                setName(v)
                if (error !== null) setError(null)
              }}
              placeholder="What to buy?"
              error={error}
            />
            <TextInput label="Quantity" value={quantity} onChange={setQuantity} type="number" inputMode="numeric" placeholder="1" />
          </FormGrid>
          <Button kind="primary" ariaLabel="Add item" onClick={addItem}>
            Add item
          </Button>
        </Card>

        <Card mono={`${total} saved`} title="Items">
          {total === 0 ? (
            <EmptyState
              mono="Empty"
              title="No items yet"
              detail="Add the first one above."
              actionLabel="Add an item"
              onAction={addItem}
            />
          ) : (
            <List label="Items">
              {items.map((i) => (
                <Row
                  key={i.id}
                  title={
                    <input
                      type="checkbox"
                      aria-label={i.data.name}
                      checked={i.data.done}
                      onChange={(e) => actions.update(i.id, { done: e.target.checked })}
                    />
                  }
                  meta={`×${i.data.quantity}`}
                  value={
                    <Button kind="ghost" onClick={() => actions.remove(i.id)}>
                      Delete {i.data.name}
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>

      </Stack>
    </AppShell>
  )
}
