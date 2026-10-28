import { useState } from 'react'
import { Body, Button, Card, Stack, TextInput, Title } from '@lacuna/ui'

export function App() {
  const [label, setLabel] = useState('')
  const [items, setItems] = useState<string[]>(['First item'])
  return (
    <main>
      <Card mono="Shelf" title="Community app">
        <Stack>
          <Title size="md">Items</Title>
          <Body>One list. Buttons and cards come from the toolbox. Color and type come from tokens.</Body>
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <TextInput label="New item" value={label} onChange={setLabel} />
          <Button
            kind="primary"
            onClick={() => {
              const next = label.trim()
              if (!next || items.includes(next)) return
              setItems([...items, next])
              setLabel('')
            }}
          >
            Add item
          </Button>
        </Stack>
      </Card>
    </main>
  )
}
