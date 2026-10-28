import { useState } from 'react'
import { Body, Card, Stack, Table, TextInput, Title } from '@lacuna/ui'

const sample = ['| Item | Amount |', '| --- | --- |', '| Coffee | 4.50 |', '| Tax | 0.40 |'].join('\n')

function parseTable(source: string): string[][] {
  const rows: string[][] = []
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (!line.includes('|')) continue
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue
    rows.push(cells)
  }
  return rows
}

export function App() {
  const [source, setSource] = useState(sample)
  const parsed = parseTable(source)
  const header = parsed[0] ?? []
  const body = parsed.slice(1)
  const columns = header.map((label, index) => ({ key: String(index), label, num: index > 0 }))
  return (
    <main>
      <Card mono="Table" title="Markdown table">
        <Stack>
          <Title size="md">Pipe table</Title>
          <Body>Paste rows separated by pipes. The separator line is dropped.</Body>
          <TextInput label="Markdown" value={source} onChange={setSource} rows={6} />
          {columns.length > 0 && (
            <Table
              columns={columns}
              rows={body.map((cells) => ({
                cells: Object.fromEntries(cells.map((cell, index) => [String(index), cell])),
              }))}
            />
          )}
        </Stack>
      </Card>
    </main>
  )
}
