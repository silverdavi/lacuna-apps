import { useLocalRecord } from '@lacuna/use-local-record'
import { AppShell, Card, EmptyState, FormGrid, TextInput } from '@lacuna/ui'

const sample = ['| Item | Amount |', '| --- | --- |', '| Coffee | 4.50 |', '| Tax | 0.40 |'].join('\n')

/**
 * Split a markdown pipe table into rows of cells.
 * Lines that do not contain a pipe are ignored. A separator row
 * (dashes and optional colons, e.g. `|---|---|`) is dropped.
 */
function parseTable(source: string): string[][] {
  const rows: string[][] = []
  for (const raw of source.split('\n')) {
    const line = raw.trim()
    if (!line.includes('|')) continue
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
    if (cells.length > 0 && cells.every((cell) => /^:?-+:?$/.test(cell))) continue
    rows.push(cells)
  }
  return rows
}

export function App() {
  const { value: source, set: setSource } = useLocalRecord<string>({
    key: 'markdown-table:source',
    version: 1,
    defaultValue: sample,
  })
  const parsed = parseTable(source)

  return (
    <AppShell
      name="Markdown table"
      icon="sheets"
      hue="blue"
      category="Productivity"
      meta={parsed.length === 0 ? 'No rows' : `${parsed.length} ${parsed.length === 1 ? 'row' : 'rows'}`}
    >
      <Card mono="Input" title="Pipe table">
        <FormGrid>
          <TextInput
            label="Markdown"
            value={source}
            onChange={setSource}
            rows={6}
          />
        </FormGrid>
      </Card>
      <Card mono="Output" title="Rows">
        {parsed.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No rows"
            detail="Paste a pipe table above and its rows appear here."
            actionLabel="Paste a table"
          />
        ) : (
          <div className="mt-rows" role="table">
            {parsed.map((cells, index) => (
              <div key={index} role="row" className="mt-row">
                <span role="cell">{cells.join(', ')}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}
