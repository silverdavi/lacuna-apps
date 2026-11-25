// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Matrix calculator: two matrices up to 5x5, Add or Multiply, an undoable cell editor,
// and a result table. The session persists on this device via the host adapter.
import { useEffect, useMemo } from 'react'
import { AppShell, Board, Button, Card, ErrorState, FormGrid, Kpi, KpiRow, Rail, Select, Stack, TextInput } from '@lacuna/ui'
import { useUndoStack } from '@lacuna/use-undo-stack'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { sessionStore } from './host'
import type { MatrixRecord, Operation, SessionRecord } from './host'
import { cellIndex, cellName, compute, DEFAULT_A, DEFAULT_B, resize } from './matrix'

const OPERATION_OPTIONS: { value: Operation; label: string }[] = [
  { value: 'add', label: 'Add' },
  { value: 'multiply', label: 'Multiply' },
]

const SIZE_OPTIONS: { value: string; label: string }[] = []
for (let n = 2; n <= 5; n += 1) {
  SIZE_OPTIONS.push({ value: `${n}x${n}`, label: `${n}x${n}` })
}

function parseSize(value: string): { rows: number; cols: number } {
  const [rows, cols] = value.split('x').map(Number)
  return { rows, cols }
}

export function App() {
  const stack = useUndoStack<SessionRecord>(sessionStore.get(), { limit: 50 })
  const record = stack.value
  const { set, undo, canUndo } = stack

  useEffect(() => {
    sessionStore.set(record)
  }, [record])

  const a: MatrixRecord = record.a
  const b: MatrixRecord = record.b
  const result = useMemo(() => compute(a, b, record.operation), [a, b, record.operation])

  const clipboard = useClipboard()

  function setCell(target: 'a' | 'b', name: string, raw: string): void {
    set((prev) => {
      const letter = target === 'a' ? 'A' : 'B'
      const source = target === 'a' ? prev.a : prev.b
      const index = cellIndex(letter, source.rows, source.cols, name)
      if (index < 0) return prev
      const values = source.values.slice()
      values[index] = raw
      const next = { ...prev }
      if (target === 'a') next.a = { ...prev.a, values }
      else next.b = { ...prev.b, values }
      return next
    })
  }

  function setBothSizes(value: string): void {
    const { rows, cols } = parseSize(value)
    set((prev) => {
      const next = { ...prev }
      next.a = resize(prev.a, rows, cols)
      next.b = resize(prev.b, rows, cols)
      return next
    })
  }

  function setSizeB(value: string): void {
    const { rows, cols } = parseSize(value)
    set((prev) => ({ ...prev, b: resize(prev.b, rows, cols) }))
  }

  function setOperation(value: string): void {
    set((prev) => ({ ...prev, operation: value === 'multiply' ? 'multiply' : 'add' }))
  }

  function resetDefaults(): void {
    stack.reset({ operation: 'add', a: DEFAULT_A, b: DEFAULT_B })
  }

  const resultText = result.kind === 'ok' ? result.values.join(' ') : ''

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify({ operation: record.operation, a, b, result: result.kind === 'ok' ? result.values : null }, null, 2),
    },
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => {
        const lines = result.kind === 'ok' ? result.values.map((v) => `"${v}"`).join(',') : ''
        return [`operation=${record.operation}`, lines].join('\n')
      },
    },
  ]

  function gridPanel(target: 'a' | 'b'): React.ReactNode {
    const g = target === 'a' ? a : b
    const letter = target === 'a' ? 'A' : 'B'
    const cells: React.ReactNode[] = []
    for (let r = 0; r < g.rows; r += 1) {
      for (let c = 0; c < g.cols; c += 1) {
        const name = cellName(letter, r * g.cols + c, g.cols)
        const value = g.values[r * g.cols + c] ?? '0'
        cells.push(
          <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TextInput
              label={name}
              value={value}
              inputMode="decimal"
              onChange={(raw) => setCell(target, name, raw)}
            />
          </div>,
        )
      }
    }
    return (
      <Card mono={`Matrix ${target.toUpperCase()}`} title={`Matrix ${target.toUpperCase()}`}>
        <Board cols={g.cols} rows={g.rows} cell={64} label={`Matrix ${target.toUpperCase()} cells`}>
          {cells}
        </Board>
      </Card>
    )
  }

  const resultBody =
    result.kind === 'ok'
      ? Array.from({ length: a.rows }, (_, r) => (
          <tr key={r}>
            {Array.from({ length: a.cols }, (_, c) => (
              <td key={c} className="num">{result.values[r * a.cols + c]}</td>
            ))}
          </tr>
        ))
      : []

  return (
    <AppShell
      name="Matrix Calculator"
      icon="grid"
      hue="gold"
      category="Productivity"
      meta={`${a.rows}x${a.cols} · ${record.operation === 'add' ? 'Add' : 'Multiply'} · ${b.rows}x${b.cols}`}
      status="Local · saved on this device"
      actions={
        <>
          <Button kind="secondary" onClick={() => void clipboard.copy(resultText)} disabled={result.kind !== 'ok'}>
            {clipboard.copied ? 'Copied' : 'Copy result'}
          </Button>
          <Button kind="secondary" onClick={undo} disabled={!canUndo}>
            Undo
          </Button>
          <ExportMenu options={exportOptions} fileName="matrix-calculator" ariaLabel="Export" disabled={result.kind !== 'ok'} />
        </>
      }
      side={
        <Rail title="Matrix Calculator" note="Add · multiply · up to 5x5" chips={['Undo', 'Local', 'Works offline']}>
          <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
            <Button kind="ghost" onClick={resetDefaults}>
              Reset to defaults
            </Button>
          </div>
        </Rail>
      }
    >
      <Stack>
        <Card mono="Setup" title="Matrices">
          <FormGrid>
            <Select label="Operation" value={record.operation} onChange={setOperation} options={OPERATION_OPTIONS} />
            <Select label="Both sizes" value={`${a.rows}x${a.cols}`} onChange={setBothSizes} options={SIZE_OPTIONS} />
            <Select label="Size B" value={`${b.rows}x${b.cols}`} onChange={setSizeB} options={SIZE_OPTIONS} />
          </FormGrid>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', marginTop: 'calc(12px * var(--sf))' }}>
            {gridPanel('a')}
            {gridPanel('b')}
          </div>
        </Card>

        <Card mono={result.kind === 'ok' ? 'Result' : 'Blocked'} title="Result">
          {result.kind === 'error' ? (
            <ErrorState mono="Blocked" title={result.message} detail="Resize the matrices so the dimensions match, then the result will appear here." />
          ) : (
            <>
              <KpiRow>
                <Kpi value={String(a.rows * a.cols)} label="Result cells" accent />
                <Kpi value={record.operation === 'add' ? 'a + b' : 'a · b'} label="Operation" />
                <Kpi value={`${a.rows}x${a.cols}`} label="A" />
                <Kpi value={`${b.rows}x${b.cols}`} label="B" />
              </KpiRow>
              <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                <table className="lc-table" aria-label="Result">
                  <tbody>{resultBody}</tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
