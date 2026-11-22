// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import { Actions, AppShell, Body, Button, Card, EmptyState, ErrorState, FormGrid, List, Row, Stack, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { host } from './host'
import { evaluate, formatValue, sampleSeries, type AngleMode } from './engine'

const CHART_WIDTH = 560
const CHART_HEIGHT = 300

export function App() {
  const [state, setState] = useState(() => host.loadState())
  const [history, setHistory] = useState(() => host.listHistory())
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('Result')
  const clipboard = useClipboard()

  useEffect(() => {
    host.saveState(state)
  }, [state])

  const chart = sampleSeries(state.expression, state.angleMode)

  function setExpression(expression: string) {
    setState((s) => ({ ...s, expression }))
  }

  function setAngleMode(angleMode: AngleMode) {
    setState((s) => ({ ...s, angleMode }))
  }

  function evaluateNow() {
    const expression = state.expression.trim()
    if (!expression) {
      setError('Type an expression first')
      setResult(null)
      setTab('Result')
      return
    }
    try {
      const value = evaluate(expression, state.angleMode)
      const text = formatValue(value)
      setResult(text)
      setError(null)
      host.addHistory(expression, value)
      setHistory(host.listHistory())
      setTab('Result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not evaluate that expression')
      setResult(null)
      setTab('Result')
    }
  }

  function clearHistory() {
    host.clearHistory()
    setHistory([])
  }

  const historyRows = history
    .map((item) => ({ item, text: `${item.expression} = ${formatValue(item.value)}` }))
    .reverse()

  const chartLines = chart.points
    .map((p) => `${48 + p.x}, ${300 - 48 - ((p.y + 1) / 2) * (300 - 48 - 48)}`)
    .join(' ')

  return (
    <AppShell
      name="Scientific Calculator"
      icon="finance"
      hue="cobalt"
      category="Productivity"
      meta={result !== null ? `Result ${result}` : undefined}
    >
      <div role="tablist" className="lc-tabs">
        {['Result', 'Chart'].map((item) => (
          <button
            type="button"
            key={item}
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <Card title="Scientific Calculator">
        <Body>Enter an expression, pick the angle mode, then evaluate.</Body>
        <FormGrid>
          <TextInput
            label="Expression"
            value={state.expression}
            onChange={setExpression}
            placeholder="2 + 3 * 4"
            error={error}
          />
          <label className="lc-field">
            <span className="lc-field-label">Angle mode</span>
            <select
              id="angle-select"
              role="select"
              className="lc-input"
              aria-label="Angle mode"
              value={state.angleMode}
              onChange={(event) => setAngleMode(event.target.value as AngleMode)}
            >
              <option value="Degrees">Degrees</option>
              <option value="Radians">Radians</option>
            </select>
          </label>
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={evaluateNow}>
            Evaluate
          </Button>
          <Button kind="ghost" onClick={() => setExpression('')}>
            Clear
          </Button>
        </Actions>
      </Card>
      <Card mono={result !== null ? `Result ${result}` : 'Result'} title="Result">
        <label className="lc-field">
          <span className="lc-field-label">Result</span>
          <input
            className={`lc-input${result !== null ? ' filled' : ''}`}
            value={result ?? ''}
            readOnly
            aria-label="Result"
            onChange={() => undefined}
          />
        </label>
        {error !== null ? (
          <div>
            <ErrorState title="Could not evaluate" detail={error} />
          </div>
        ) : result !== null ? (
          <Stack>
            <Actions>
              <Button onClick={() => void clipboard.copy(result)}>Copy result</Button>
            </Actions>
          </Stack>
        ) : (
          <EmptyState
            mono="Empty"
            title="No result yet"
            detail="Evaluate an expression to see its value."
            actionLabel="Evaluate an expression"
          />
        )}
      </Card>
      <Card mono={`${history.length} items`} title="History">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history"
            detail="Evaluate an expression to start the list."
            actionLabel="Evaluate an expression"
          />
        ) : (
          <Stack>
            <List label="History">
              {historyRows.map(({ item, text }) => (
                <Row key={item.id} title={text} />
              ))}
            </List>
            <Actions>
              <Button onClick={clearHistory}>Clear history</Button>
            </Actions>
          </Stack>
        )}
      </Card>
      {tab === 'Chart' ? (
        <Card mono="sin(x)" title="Chart">
          <Body>
            {chart.atX !== null
              ? `At x = 30: y = ${formatValue(chart.atX.y)}`
              : 'Evaluate an expression containing x to plot it here.'}
          </Body>
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="sin(x) curve"
            style={{ display: 'block', overflow: 'visible' }}
          >
            <line x1={48} y1={252} x2={512} y2={252} stroke="var(--hair-strong)" strokeWidth={1} />
            <line x1={48} y1={48} x2={48} y2={252} stroke="var(--hair-strong)" strokeWidth={1} />
            {chart.points.length > 1 ? (
              <polyline points={chartLines} fill="none" stroke="var(--ink)" strokeWidth={1.5} />
            ) : null}
            <line x1={48 + 30} y1={48} x2={48 + 30} y2={252} stroke="var(--accent)" strokeWidth={1} />
            {chart.atX !== null ? (
              <g>
                <circle cx={48 + 30} cy={300 - 48 - ((chart.atX.y + 1) / 2) * 204} r={5} fill="var(--accent)" />
                <text
                  x={48 + 30}
                  y={300 - 48 - ((chart.atX.y + 1) / 2) * 204 - 12}
                  textAnchor="middle"
                  fill="var(--ink)"
                  fontSize={12}
                  fontFamily="var(--mono)"
                >
                  {formatValue(chart.atX.y)}
                </text>
              </g>
            ) : null}
            <text x={48} y={272} fill="var(--ink)" fontSize={10} fontFamily="var(--mono)">0</text>
            <text x={280} y={272} fill="var(--ink)" fontSize={10} fontFamily="var(--mono)">180</text>
            <text x={504} y={272} fill="var(--ink)" fontSize={10} fontFamily="var(--mono)">360</text>
          </svg>
        </Card>
      ) : null}
    </AppShell>
  )
}
