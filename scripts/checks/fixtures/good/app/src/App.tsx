import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, TextInput } from '@lacuna/ui'

// A known-good outside app for the gate's self-test. Bad fixtures extend it and change one thing.
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
    <AppShell name="Packing list" icon="docs" hue="gold" category="Track" meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}>
      <Card mono="New" title="Add an item">
        <FormGrid>
          <TextInput label="Item name" value={label} onChange={setLabel} error={error} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={add}>Add item</PrimaryButton>
        </Actions>
      </Card>
      <Card mono={`${items.length} saved`} title="Items">
        {items.length === 0 ? (
          <EmptyState mono="Empty" title="No items yet" detail="Add the first one above." actionLabel="Add an item" onAction={add} />
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
