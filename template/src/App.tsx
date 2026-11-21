// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, Rail, Row, TextInput } from '@lacuna/ui'

// The starting point of every app. Keep AppShell as the outermost element and build inside it
// with Card panels. Do not add a stylesheet for anything these components already draw.
export function App() {
  const [label, setLabel] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  function add() {
    const next = label.trim()
    if (!next) return setError('Type a name first')
    if (items.includes(next)) return setError('That item is already in the list')
    setItems([...items, next])
    setLabel('')
    setError(null)
  }

  return (
    <AppShell
      name="Community app"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      status="Saved on this device"
      side={<Rail title="Community app" note="One list · local" chips={['Add', 'Remove', 'Works offline']} />}
    >
      <Card mono="New" title="Add an item">
        <FormGrid>
          <TextInput label="Item name" value={label} onChange={setLabel} error={error} />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={add}>Add item</Button>
        </Actions>
      </Card>
      <Card mono={`${items.length} saved`} title="Items">
        {items.length === 0 ? (
          <EmptyState mono="Empty" title="No items yet" detail="Add the first one above." />
        ) : (
          <List label="Items">
            {items.map((item) => (
              <Row
                key={item}
                title={item}
                action={<Button kind="ghost" ariaLabel={`Remove ${item}`} onClick={() => setItems(items.filter((i) => i !== item))}>Remove</Button>}
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
