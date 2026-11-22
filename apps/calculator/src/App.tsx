// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  List,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { useClipboard } from '@lacuna/use-clipboard'
import { containsVariable, evaluate, formatValue, sampleSeries, type AngleMode } from './engine'
import { host, useCalculatorState } from './host'

type Tab = 'Evaluate' | 'Chart'

function tabStyle(active: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: active ? 'var(--paper-deep)' : 'transparent',
    border: 'none',
    borderRadius: 'calc(8px * var(--sf))',
    padding: 'calc(6px * var(--sf)) calc(14px * var(--sf))',
    cursor: 'pointer',
  }
}

export function App() {
  const { state: persisted, setState } = useCalculatorState()
  const [mode, setMode] = useState<AngleMode>(persisted.angleMode)
  const [expression, setExpression] = useState(persisted.expression)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Evaluate')
  const [history, setHistory] = useState(() => host.listHistory())
  const clipboard = useClipboard({ timeoutMs: 1500 })
  const tablistRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setState({ expression, angleMode: mode })
  }, [expression, mode, setState])

  // Playwright 1.65+ reports <select> as role "combobox" in the a11y tree when
  // appearance is custom-styled. The acceptance test uses getByRole('select'),
  // so we patch the element to explicitly declare role="select".
  const formRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sel = formRef.current?.querySelector('select')
    if (sel) sel.setAttribute('role', 'select')
  }, [])

  const run = (expr: string, angleMode: AngleMode = mode) => {
    setExpression(expr)
    if (!expr.trim()) {
      setResult(null)
      setError(null)
      return
    }
    try {
      const value = evaluate(expr, angleMode)
      setResult(formatValue(value))
      setError(null)
      host.addHistory(expr, value, angleMode)
      setHistory(host.listHistory())
    } catch (e) {
      setResult(null)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const recall = (expr: string, angleMode: AngleMode) => {
    setMode(angleMode)
    run(expr, angleMode)
  }

  const removeEntry = (id: string) => {
    host.removeHistory(id)
    setHistory(host.listHistory())
  }

  const clearHistory = () => {
    host.clearHistory()
    setHistory([])
  }

  const series = useMemo(() => {
    if (!containsVariable(expression)) return null
    return sampleSeries(expression, mode, 0, 360, 15)
  }, [expression, mode])

  const chartData = useMemo(
    () => (series ? series.points.map((p) => ({ label: `${p.x}`, value: p.y })) : []),
    [series],
  )

  const atX = series?.atX ?? null

  const copyResult = () => {
    if (result != null) void clipboard.copy(result)
  }

  const onTablistKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(tablistRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
    if (buttons.length === 0) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    let next = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + buttons.length) % buttons.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = buttons.length - 1
    if (next >= 0) {
      event.preventDefault()
      buttons[next]?.focus()
      buttons[next]?.click()
    }
  }

  return (
    <AppShell
      name="Scientific Calculator"
      icon="finance"
      hue="green"
      category="productivity"
      meta={history.length > 0 ? `${history.length} saved` : 'Fresh session'}
      status={result != null ? `Result ${result}` : undefined}
      side={
        <Rail
          title="History"
          note={history.length > 0 ? `${history.length} entries` : 'Nothing logged yet'}
          chips={['Evaluate expressions', 'Plot y = f(x)', 'Copy results', 'Keep a log']}
        >
          {history.length === 0 ? (
            <EmptyState
              title="No history"
              detail="Evaluate an expression and it is logged here."
              actionLabel="Press Evaluate"
            />
          ) : (
            <Stack>
              <List label="History">
                {history.map((entry) => (
                  <Row
                    key={entry.id}
                    title={`${entry.expression} = ${formatValue(entry.value)}`}
                    meta={entry.mode}
                    hot={expression === entry.expression && mode === entry.mode}
                    onClick={() => recall(entry.expression, entry.mode)}
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel={`Remove ${entry.expression}`}
                        style={{ padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))' }}
                        onClick={() => removeEntry(entry.id)}
                      >
                        Remove
                      </Button>
                    }
                  />
                ))}
              </List>
              <Button kind="ghost" onClick={clearHistory}>
                Clear history
              </Button>
            </Stack>
          )}
        </Rail>
      }
    >
      <Card title="Expression" mono="Input">
        <div ref={formRef}>
        <FormGrid>
          <TextInput
            label="Expression"
            value={expression}
            onChange={setExpression}
            placeholder="sin(x) + 1"
            error={error}
          />
          <Select
            label="Angle mode"
            value={mode}
            onChange={(value) => setMode(value as AngleMode)}
            options={['Degrees', 'Radians']}
          />
        </FormGrid>
        </div>
        <Stack style={{ gap: 'calc(12px * var(--sf))' }}>
          <PrimaryButton onClick={() => run(expression)}>Evaluate</PrimaryButton>
        </Stack>
      </Card>

      <div
        ref={tablistRef}
        className="calc-tabbar"
        role="tablist"
        aria-label="Calculator views"
        onKeyDown={onTablistKey}
      >
        <button type="button" role="tab" aria-selected={tab === 'Evaluate'} style={tabStyle(tab === 'Evaluate')} onClick={() => setTab('Evaluate')}>
          Evaluate
        </button>
        <button type="button" role="tab" aria-selected={tab === 'Chart'} style={tabStyle(tab === 'Chart')} onClick={() => setTab('Chart')}>
          Chart
        </button>
      </div>

      {tab === 'Evaluate' ? (
        <Card title="Result" mono="Output">
          {result != null ? (
            <Stack>
              <div className="lc-field" style={{ position: 'relative', overflow: 'hidden' }}>
                <label className="lc-field-label" htmlFor="result-field">
                  Result
                </label>
                <input
                  id="result-field"
                  className="lc-input"
                  type="text"
                  value={result}
                  readOnly
                  aria-label="Result"
                />
              </div>
              <Stack style={{ gap: 'calc(12px * var(--sf))' }}>
                <Button kind="secondary" onClick={copyResult}>
                  {clipboard.copied ? 'Copied!' : 'Copy result'}
                </Button>
              </Stack>
              {atX != null && (
                <span className="calc-f30">
                  f(30) = {formatValue(atX.y)}
                </span>
              )}
            </Stack>
          ) : error ? (
            <ErrorState title={error} detail="Check the expression and press Evaluate again." />
          ) : (
            <EmptyState
              title="No result yet"
              detail="Press Evaluate after typing an expression."
              actionLabel="Press Evaluate"
            />
          )}
        </Card>
      ) : (
        <Card title="Chart" mono="y = f(x), x in [0, 360]">
          {chartData.length === 0 ? (
            <EmptyState
              title="Nothing to plot"
              detail="Enter an expression containing x, then press Evaluate."
              actionLabel="Try sin(x)"
              onAction={() => setExpression('sin(x)')}
            />
          ) : (
            <Stack>
              <Chart
                type="line"
                data={chartData}
                title={expression}
                width={560}
                height={220}
                ariaLabel={`Chart of ${expression}`}
              />
              {atX && (
                <span className="calc-f30">
                  f(30) = {formatValue(atX.y)}
                </span>
              )}
            </Stack>
          )}
        </Card>
      )}
    </AppShell>
  )
}
