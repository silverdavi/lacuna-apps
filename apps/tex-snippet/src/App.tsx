import { useState } from 'react'
import { Body, Button, Card, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'

export function App() {
  const [source, setSource] = useState('E = mc^2')
  return (
    <main>
      <Card mono="Math" title="TeX snippet">
        <Stack>
          <Title size="md">Fragment</Title>
          <Body>Type the TeX. The math module renders it later. This page keeps the source.</Body>
          <TextInput label="Source" value={source} onChange={setSource} rows={6} />
          <MonoLabel>{source.trim().length} characters</MonoLabel>
          <Button kind="primary" onClick={() => setSource(source.trim())}>Trim</Button>
        </Stack>
      </Card>
    </main>
  )
}
