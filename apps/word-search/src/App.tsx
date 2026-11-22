import { useState } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Keys,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { generatePuzzle, parseWords, puzzleText, scoreFor } from './engine'
import { host, type PuzzleRecord } from './host'
import './styles.css'

type Tab = 'Play' | 'Stats'

export function App() {
  const [record, setRecord] = useState<PuzzleRecord | null>(() => host.loadPuzzle())
  const [wordsInput, setWordsInput] = useState(() => record?.words.join(',') ?? '')
  const [sizeInput, setSizeInput] = useState(() => String(record?.size ?? 10))
  const [tab, setTab] = useState<Tab>('Play')
  const [start, setStart] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const foundCells = new Set(
    (record?.found ?? []).flatMap((word) => cellsOnLine(record?.grid ?? [], word)),
  )

  function parseSize(raw: string): number {
    const parsed = parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return 10
    return Math.min(20, Math.max(4, parsed))
  }

  function generate(wordsRaw: string, sizeRaw: string, seed?: number) {
    const words = parseWords(wordsRaw)
    const gridSize = parseSize(sizeRaw)
    if (words.length === 0) {
      setError('Type at least one word of two letters or more')
      return
    }
    const longest = words.reduce((max, word) => Math.max(max, word.length), 0)
    if (longest > gridSize) {
      setError(`"${words.find((word) => word.length === longest)}" needs a grid of at least ${longest}`)
      return
    }
    const grid = generatePuzzle(words, gridSize, seed)
    const next: PuzzleRecord = {
      id: record?.id ?? `puzzle-${Date.now().toString(36)}`,
      kind: 'puzzle',
      words,
      found: [],
      size: gridSize,
      grid,
      seed: seed ?? Math.floor(Math.random() * 1_000_000),
      score: 0,
      best: record?.best ?? 0,
      updatedAt: Date.now(),
    }
    host.savePuzzle(next)
    setRecord(next)
    setStart(null)
    setError(null)
  }

  function onCellClick(row: number, col: number) {
    if (!record) return
    if (start === null) {
      setStart([row, col])
      return
    }
    if (start[0] === row && start[1] === col) {
      setStart(null)
      return
    }
    const word = wordBetween(record.grid, start, [row, col])
    if (word === null) {
      setStart([row, col])
      return
    }
    setStart(null)
    if (record.found.includes(word)) return
    const score = record.score + scoreFor(word)
    const next: PuzzleRecord = {
      ...record,
      found: [...record.found, word],
      score,
      best: Math.max(record.best, score),
      updatedAt: Date.now(),
    }
    host.savePuzzle(next)
    setRecord(next)
  }

  function restart() {
    if (!record) return
    generate(record.words.join(','), String(record.size), record.seed + 1)
  }

  function puzzleComplete() {
    return record !== null && record.words.every((word) => record.found.includes(word))
  }

  const copyLabel = copied ? 'Copied' : 'Copy Puzzle'
  // Card title. When empty, keep it neutral so "No puzzle loaded" (the empty
  // state) appears exactly once on the page.
  const boardTitle =
    record === null
      ? 'Board'
      : puzzleComplete()
        ? `All ${record.words.length} words found`
        : `Find ${record.words.length} words`

  const boardActions = (
    <Actions>
      <Button kind="primary" onClick={() => generate(wordsInput, sizeInput)}>
        Generate
      </Button>
      <Button kind="secondary" disabled={record === null} onClick={restart}>
        Restart
      </Button>
      <Button
        kind="secondary"
        disabled={record === null}
        onClick={() => record && copy(puzzleText(record.grid))}
      >
        {copyLabel}
      </Button>
    </Actions>
  )

  return (
    <AppShell
      name="Word Search"
      icon="search"
      hue="cobalt"
      category="Games"
      side={
        <Rail title="Word Search" note="Find every word, in any direction">
          <KpiRow>
            <Kpi value={String(record?.score ?? 0)} label="Score" accent />
            <Kpi value={String(record?.best ?? 0)} label="Best" />
          </KpiRow>
          <Keys items={[['Click', 'Select first letter'], ['Click', 'Select last letter']]} />
        </Rail>
      }
    >
      <Stack>
        <div className="lc-tabs" role="tablist">
          {(['Play', 'Stats'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={item === tab ? 'lc-tab active ws-tab' : 'lc-tab ws-tab'}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === 'Play' ? (
          <Stack>
            <Card mono="Setup" title="Words">
              <FormGrid>
                <TextInput
                  label="Words"
                  value={wordsInput}
                  onChange={setWordsInput}
                  placeholder="CAT,DOG"
                  error={error}
                />
                <TextInput label="Size" type="number" value={sizeInput} onChange={setSizeInput} />
              </FormGrid>
            </Card>
            <Card mono={record === null ? 'Setup' : `Score: ${record.score}`} title={boardTitle} actions={boardActions}>
              {record === null ? (
                <EmptyState
                  mono="Empty"
                  title="No puzzle loaded"
                  detail="Enter your words and size above."
                  actionLabel="Then press Generate"
                />
              ) : (
                <Board cols={record.size} rows={record.size} label="Word search board">
                  {record.grid.map((line, row) => (
                    <div key={row} role="row" className="ws-row">
                      {line.map((letter, col) => {
                        const active =
                          foundCells.has(`${row}:${col}`) ||
                          (start !== null && start[0] === row && start[1] === col)
                        return (
                          <button
                            type="button"
                            key={col}
                            role="gridcell"
                            aria-label={`Row ${row + 1}, column ${col + 1}, ${letter}`}
                            className={active ? 'ws-cell on' : 'ws-cell'}
                            onClick={() => onCellClick(row, col)}
                            style={{ background: active ? 'var(--accent-soft)' : 'var(--ui-bg)' }}
                          >
                            {letter}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </Board>
              )}
            </Card>
          </Stack>
        ) : (
          <Card mono="Career" title="Stats">
            {record === null ? (
              <EmptyState
                mono="Empty"
                title="No puzzle loaded"
                detail="Solve a puzzle to build your record."
                actionLabel="Go to Play"
                onAction={() => setTab('Play')}
              />
            ) : (
              <Table
                label="Statistics"
                columns={[
                  { key: 'metric', label: 'Metric' },
                  { key: 'value', label: 'Value', num: true },
                ]}
                rows={[
                  { cells: { metric: 'Best Score', value: String(record.best) } },
                  { cells: { metric: 'Current Score', value: String(record.score) } },
                  { cells: { metric: 'Words', value: String(record.words.length) } },
                  { cells: { metric: 'Found', value: `${record.found.length}/${record.words.length}` } },
                  { cells: { metric: 'Grid', value: `${record.size} by ${record.size}` } },
                ]}
              />
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}

function cellsOnLine(grid: string[][], word: string): string[] {
  const line = findLine(grid, word)
  if (line === null) return []
  return lineCells(word, line)
}

function findLine(grid: string[][], word: string): [number, number, number, number] | null {
  const size = grid.length
  const dirs: Array<[number, number]> = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (grid[row][col] !== word[0]) continue
      for (const [dr, dc] of dirs) {
        const endRow = row + dr * (word.length - 1)
        const endCol = col + dc * (word.length - 1)
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue
        let match = true
        for (let i = 0; i < word.length; i++) {
          if (grid[row + dr * i][col + dc * i] !== word[i]) {
            match = false
            break
          }
        }
        if (match) return [row, col, dr, dc]
      }
    }
  }
  return null
}

function lineCells(word: string, line: [number, number, number, number]): string[] {
  const [row, col, dr, dc] = line
  const cells: string[] = []
  for (let i = 0; i < word.length; i++) {
    cells.push(`${row + dr * i}:${col + dc * i}`)
  }
  return cells
}

function wordBetween(grid: string[][], a: [number, number], b: [number, number]): string | null {
  const size = grid.length
  const dr = b[0] - a[0]
  const dc = b[1] - a[1]
  if (dr === 0 && dc === 0) return null
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  const steps = Math.max(Math.abs(dr), Math.abs(dc))
  if (steps > 1 && (dr % steps !== 0 || dc % steps !== 0)) return null
  const stepRow = steps === 0 ? 0 : dr / steps
  const stepCol = steps === 0 ? 0 : dc / steps
  const endRow = a[0] + dr
  const endCol = a[1] + dc
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return null
  let word = ''
  for (let i = 0; i <= steps; i++) {
    word += grid[a[0] + stepRow * i][a[1] + stepCol * i]
  }
  if (word.length < 2) return null
  return word
}
