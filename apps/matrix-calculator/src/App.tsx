// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Matrix calculator: two matrices up to 5x5, Add or Multiply, an undoable cell editor,
// and a result table. The session persists on this device via the host adapter.
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { AppShell, Board, Button, Card, ErrorState, Kpi, KpiRow, Rail, Select, Stack } from '@lacuna/ui'
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

const DIMENSION_OPTIONS: { value: string; label: string }[] = []
for (let r = 2; r <= 5; r += 1) {
  for (let c = 2; c <= 5; c += 1) {
    DIMENSION_OPTIONS.push({ value: `${r}x${c}`, label: `${r}x${c}` })
  }
}

function parseSize(value: string): { rows: number; cols: number } {
  const [rows, cols] = value.split('x').map(Number)
  return { rows, cols }
}

function cellNames(rows: number, cols: number): string[] {
  const names: string[] = []
  for (let i = 0; i < rows * cols; i += 1) names.push(cellName(rows, cols, i))
  return names
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

  function setCell(target: 'a' | 'b', name: string, value: string): void {
    set((prev) => {
      const rows = target === 'a' ? prev.a.rows : prev.b.rows
      const cols = target === 'a' ? prev.a.cols : prev.b.cols
      const index = cellIndex(rows, cols, name)
      const source = target === 'a' ? prev.a : prev.b
      const values = source.values.slice()
      if (index >= 0 && index < values.length) values[index] = value
      const next = { ...prev }
      if (target === 'a') next.a = { ...prev.a, values }
      else next.b = { ...prev.b, values }
      return next
    })
  }

  function setDimension(target: 'a' | 'b', value: string): void {
    const { rows, cols } = parseSize(value)
    set((prev) => {
      const out = { ...prev }
      if (target === 'a') {
        out.a = resize(prev.a, rows, cols)
        out.b = resize(prev.b, rows, cols)
      } else {
        out.b = resize(prev.b, rows, cols)
      }
      return out
    })
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

  const dimsOk =
    record.operation === 'add'
      ? a.rows === b.rows && a.cols === b.cols
      : a.rows === b.cols && b.rows === a.cols

  function gridPanel(target: 'a' | 'b'): ReactNode {
    const g = target === 'a' ? a : b
    const names = cellNames(g.rows, g.cols)
    const showDimSelect = target === 'a' || record.operation === 'multiply'
    return (
      <Card mono={`Matrix ${target.toUpperCase()}`} title={`Matrix ${target.toUpperCase()}`}>
        {showDimSelect ? (
          <label className="lc-field">
            <span className="lc-field-label">{target === 'a' ? 'Dimensions' : 'B dimensions'}</span>
            <select
              className="lc-input"
              aria-label={target === 'a' ? 'Dimensions' : 'B dimensions'}
              value={`${g.rows}x${g.cols}`}
              onChange={(event) => setDimension(target, event.target.value)}
            >
              {DIMENSION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
              <Board cols={g.cols} rows={g.rows} cell={56} label={`Matrix ${target.toUpperCase()} cells`}>
                {names.map((name, i) => {
                  const value = g.values[i] ?? '0'
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <input
                        className="lc-input"
                        style={{ width: 'calc(40px * var(--sf))', textAlign: 'center' }}
                        aria-label={target === 'a' ? name : `Matrix B cell ${i + 1}`}
                        inputMode="decimal"
                        value={value}
                        onChange={(event) => setCell(target, name, event.target.value)}
                      />
                    </div>
                  )
                })}
              </Board>
        </div>
      </Card>
    )
  }

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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))' }}>
            <div>
              <Select label="Operation" value={record.operation} onChange={setOperation} options={OPERATION_OPTIONS} />
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(12px * var(--sf))', marginTop: 'calc(12px * var(--sf))' }}>
            {gridPanel('a')}
            {gridPanel('b')}
          </div>
        </Card>

        <Card mono={dimsOk ? 'Result' : 'Blocked'} title="Result">
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
                <Board cols={a.cols} rows={a.rows} cell={52} label="Result grid">
                  {result.values.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="lc-kpi-value">{v}</span>
                    </div>
                  ))}
                </Board>
              </div>
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
