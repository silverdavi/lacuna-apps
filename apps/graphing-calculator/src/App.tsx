// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState, useMemo, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  Keys,
  List,
  PrimaryButton,
  Rail,
  Row,
  Table,
  TextInput,
} from '@lacuna/ui'
import { NumberInput } from '@lacuna/number-input'
import { Chart } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { host } from './host'
import { compile } from './math/evaluator'
import { SERIES_COLORS, EXPORT_GRID, EXPORT_AXIS, EXPORT_LABEL, EXPORT_BG } from './colors'

type Tab = 'Graph' | 'Table'
type GraphStyle = 'line' | 'chart'

type PlotFunction = {
  id: string
  expression: string
  fn: (x: number) => number
  color: string
}

type ViewPrefs = {
  showGrid: boolean
  graphStyle: GraphStyle
}

function initState() {
  const state = host.loadState()
  return {
    functions: state.functions.map((f, i) => {
      try {
        return {
          id: f.id,
          expression: f.expression,
          fn: compile(f.expression),
          color: SERIES_COLORS[i % SERIES_COLORS.length],
        }
      } catch {
        return null
      }
    }).filter((f): f is PlotFunction => f !== null),
    xmin: state.xmin,
    xmax: state.xmax,
  }
}

function buildCsv(fns: PlotFunction[], xMin: number, xMax: number, sampleStep: number): string {
  const header = ['x', ...fns.map((f) => f.expression)]
  const step = xMax - xMin
  const numRows = step / sampleStep
  const lines: string[] = [header.join(',')]
  for (let i = 0; i <= numRows; i++) {
    const x = xMin + i * sampleStep
    const xLabel = parseFloat(x.toFixed(10)).toString()
    const cells = fns.map((f) => {
      try {
        const y = f.fn(x)
        return Number.isFinite(y) ? parseFloat(y.toFixed(10)).toString() : ''
      } catch {
        return ''
      }
    })
    lines.push([xLabel, ...cells].join(','))
  }
  return lines.join('\n')
}

export function App() {
  const [init] = useState(initState)
  const [expression, setExpression] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [functions, setFunctions] = useState<PlotFunction[]>(init.functions)
  const [xmin, setXmin] = useState(init.xmin)
  const [xmax, setXmax] = useState(init.xmax)
  const [tab, setTab] = useState<Tab>('Graph')
  const [sampleStep, setSampleStep] = useState(1)
  const { value: prefs, set: setPrefs } = useLocalRecord<ViewPrefs>({
    key: 'lacuna.graphing-calculator.view',
    version: 0,
    defaultValue: { showGrid: true, graphStyle: 'line' },
  })
  const showGrid = prefs.showGrid
  const graphStyle = prefs.graphStyle
  const setShowGrid = useCallback((v: boolean) => setPrefs((p) => ({ ...p, showGrid: v })), [setPrefs])
  const setGraphStyle = useCallback((v: GraphStyle) => setPrefs((p) => ({ ...p, graphStyle: v })), [setPrefs])
  const clipboard = useClipboard({ timeoutMs: 1500 })

  const persist = useCallback(
    (fns: PlotFunction[], min: string, max: string) => {
      host.saveState({
        functions: fns.map((f) => ({
          id: f.id,
          expression: f.expression,
          savedAt: Date.now(),
        })),
        xmin: min,
        xmax: max,
      })
    },
    [],
  )

  const plot = useCallback(() => {
    const expr = expression.trim()
    if (!expr) {
      setError('Type an expression first')
      return
    }
    if (functions.some((f) => f.expression === expr)) {
      setError('Already plotted')
      return
    }
    let fn: (x: number) => number
    try {
      fn = compile(expr)
      fn(0)
    } catch {
      setError('Could not parse expression')
      return
    }
    const record = host.addFunction({ expression: expr, savedAt: Date.now() })
    const newFn: PlotFunction = {
      id: record.id,
      expression: expr,
      fn,
      color: SERIES_COLORS[functions.length % SERIES_COLORS.length],
    }
    const next = [...functions, newFn]
    setFunctions(next)
    setExpression('')
    setError(null)
    persist(next, xmin, xmax)
  }, [expression, functions, xmin, xmax, persist])

  const remove = useCallback(
    (id: string) => {
      const next = functions.filter((f) => f.id !== id)
      host.removeFunction(id)
      setFunctions(next)
      persist(next, xmin, xmax)
    },
    [functions, xmin, xmax, persist],
  )

  const handleXminChange = useCallback(
    (v: string) => {
      setXmin(v)
      persist(functions, v, xmax)
    },
    [functions, xmax, persist],
  )

  const handleXmaxChange = useCallback(
    (v: string) => {
      setXmax(v)
      persist(functions, xmin, v)
    },
    [functions, xmin, persist],
  )

  const exportPng = useCallback(() => {
    const W = 800
    const H = 500
    const pad = 50
    const xMin = parseFloat(xmin) || -10
    const xMax = parseFloat(xmax) || 10
    const xRange = xMax - xMin || 1

    const yValues: number[] = [0]
    for (const f of functions) {
      for (let i = 0; i <= 200; i++) {
        const x = xMin + (i / 200) * xRange
        try {
          const y = f.fn(x)
          if (Number.isFinite(y) && Math.abs(y) < 1e6) yValues.push(y)
        } catch {
          // skip
        }
      }
    }
    const yMin = Math.min(...yValues)
    const yMax = Math.max(...yValues)
    const yRange = yMax - yMin || 1

    const toSvgX = (x: number) => pad + ((x - xMin) / xRange) * (W - 2 * pad)
    const toSvgY = (y: number) => H - pad - ((y - yMin) / yRange) * (H - 2 * pad)

    const parts: string[] = []
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    )
    parts.push(`<rect width="${W}" height="${H}" fill="${EXPORT_BG}"/>`)

    const xStep = xRange / 10
    for (let i = 0; i <= 10; i++) {
      const x = xMin + i * xStep
      const sx = toSvgX(x)
      parts.push(
        `<line x1="${sx.toFixed(1)}" y1="${pad}" x2="${sx.toFixed(1)}" y2="${H - pad}" stroke="${EXPORT_GRID}" stroke-width="1"/>`,
      )
      parts.push(
        `<text x="${sx.toFixed(1)}" y="${H - pad + 20}" text-anchor="middle" font-size="12" fill="${EXPORT_LABEL}">${parseFloat(x.toFixed(1)).toString()}</text>`,
      )
    }
    const yStep = yRange / 5
    for (let i = 0; i <= 5; i++) {
      const y = yMin + i * yStep
      const sy = toSvgY(y)
      parts.push(
        `<line x1="${pad}" y1="${sy.toFixed(1)}" x2="${W - pad}" y2="${sy.toFixed(1)}" stroke="${EXPORT_GRID}" stroke-width="1"/>`,
      )
      parts.push(
        `<text x="${pad - 8}" y="${(sy + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="${EXPORT_LABEL}">${parseFloat(y.toFixed(1)).toString()}</text>`,
      )
    }

    if (xMin <= 0 && xMax >= 0) {
      const x0 = toSvgX(0)
      parts.push(
        `<line x1="${x0.toFixed(1)}" y1="${pad}" x2="${x0.toFixed(1)}" y2="${H - pad}" stroke="${EXPORT_AXIS}" stroke-width="1.5"/>`,
      )
    }
    if (yMin <= 0 && yMax >= 0) {
      const y0 = toSvgY(0)
      parts.push(
        `<line x1="${pad}" y1="${y0.toFixed(1)}" x2="${W - pad}" y2="${y0.toFixed(1)}" stroke="${EXPORT_AXIS}" stroke-width="1.5"/>`,
      )
    }

    for (const f of functions) {
      const points: string[] = []
      for (let i = 0; i <= 400; i++) {
        const x = xMin + (i / 400) * xRange
        try {
          const y = f.fn(x)
          if (Number.isFinite(y) && Math.abs(y) < 1e6) {
            if (points.length > 0) points.push('L')
            points.push(`${toSvgX(x).toFixed(2)},${toSvgY(y).toFixed(2)}`)
          } else {
            points.length = 0
          }
        } catch {
          points.length = 0
        }
      }
      if (points.length > 1) {
        const d = `M${points.join('')}`
        parts.push(`<path d="${d}" fill="none" stroke="${f.color}" stroke-width="2"/>`)
      }
    }

    parts.push('</svg>')

    const svgStr = parts.join('')
    const blob = new Blob([svgStr], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = EXPORT_BG
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(img, 0, 0, W, H)
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob)
            const a = document.createElement('a')
            a.href = pngUrl
            a.download = 'graph.png'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(pngUrl)
          }
          URL.revokeObjectURL(url)
        }, 'image/png')
      } else {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [functions, xmin, xmax])

  const buildCsvString = useCallback((): string => {
    const xMin = parseFloat(xmin) || -10
    const xMax = parseFloat(xmax) || 10
    return buildCsv(functions, xMin, xMax, sampleStep)
  }, [functions, xmin, xmax, sampleStep])

  const copyCsv = useCallback(async () => {
    try {
      await clipboard.copy(buildCsvString())
    } catch {
      // clipboard unavailable
    }
  }, [clipboard, buildCsvString])

  const exportMenuOptions = useMemo(() => {
    if (functions.length === 0) return []
    const xMin = parseFloat(xmin) || -10
    const xMax = parseFloat(xmax) || 10
    return [
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => buildCsv(functions, xMin, xMax, sampleStep),
      },
      {
        id: 'svg',
        label: 'SVG',
        mimeType: 'image/svg+xml',
        extension: 'svg',
        getData: () => {
          const parts: string[] = []
          const W = 800
          const H = 500
          const pad = 50
          const yValues: number[] = [0]
          for (const f of functions) {
            for (let i = 0; i <= 200; i++) {
              const x = xMin + (i / 200) * (xMax - xMin)
              try {
                const y = f.fn(x)
                if (Number.isFinite(y) && Math.abs(y) < 1e6) yValues.push(y)
              } catch {
                // skip
              }
            }
          }
          const yMin = Math.min(...yValues)
          const yMax = Math.max(...yValues)
          const yRange = yMax - yMin || 1
          const toSvgX = (x: number) => pad + ((x - xMin) / (xMax - xMin || 1)) * (W - 2 * pad)
          const toSvgY = (y: number) => H - pad - ((y - yMin) / yRange) * (H - 2 * pad)
          parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`)
          parts.push(`<rect width="${W}" height="${H}" fill="${EXPORT_BG}"/>`)
          if (xMin <= 0 && xMax >= 0) {
            const x0 = toSvgX(0)
            parts.push(`<line x1="${x0.toFixed(1)}" y1="${pad}" x2="${x0.toFixed(1)}" y2="${H - pad}" stroke="${EXPORT_AXIS}" stroke-width="1.5"/>`)
          }
          if (yMin <= 0 && yMax >= 0) {
            const y0 = toSvgY(0)
            parts.push(`<line x1="${pad}" y1="${y0.toFixed(1)}" x2="${W - pad}" y2="${y0.toFixed(1)}" stroke="${EXPORT_AXIS}" stroke-width="1.5"/>`)
          }
          for (const f of functions) {
            const points: string[] = []
            for (let i = 0; i <= 400; i++) {
              const x = xMin + (i / 400) * (xMax - xMin)
              try {
                const y = f.fn(x)
                if (Number.isFinite(y) && Math.abs(y) < 1e6) {
                  if (points.length > 0) points.push('L')
                  points.push(`${toSvgX(x).toFixed(2)},${toSvgY(y).toFixed(2)}`)
                } else {
                  points.length = 0
                }
              } catch {
                points.length = 0
              }
            }
            if (points.length > 1) {
              const d = `M${points.join('')}`
              parts.push(`<path d="${d}" fill="none" stroke="${f.color}" stroke-width="2"/>`)
            }
          }
          parts.push('</svg>')
          return parts.join('')
        },
      },
    ]
  }, [functions, xmin, xmax, sampleStep])

  const tableRows = useMemo(() => {
    if (functions.length === 0) return []
    const xMin = parseFloat(xmin)
    const xMax = parseFloat(xmax)
    if (Number.isNaN(xMin) || Number.isNaN(xMax) || xMin >= xMax) return []
    const step = xMax - xMin
    const numRows = Math.min(20, Math.max(1, Math.round(step / (sampleStep || 1))))
    const delta = step / numRows
    const rows: { cells: Record<string, ReactNode> }[] = []
    for (let i = 0; i <= numRows; i++) {
      const x = xMin + i * delta
      const xLabel = parseFloat(x.toFixed(10)).toString()
      const cells: Record<string, ReactNode> = { x: xLabel }
      for (const f of functions) {
        try {
          const y = f.fn(x)
          cells[f.expression] = Number.isFinite(y) ? parseFloat(y.toFixed(10)).toString() : '\u2014'
        } catch {
          cells[f.expression] = '\u2014'
        }
      }
      rows.push({ cells })
    }
    return rows
  }, [functions, xmin, xmax, sampleStep])

  const tableColumns = useMemo(() => {
    const cols: { key: string; label: string; num?: boolean }[] = [
      { key: 'x', label: 'x', num: true },
    ]
    for (const f of functions) {
      cols.push({ key: f.expression, label: f.expression, num: true })
    }
    return cols
  }, [functions])

  const graphWidth = 600
  const graphHeight = 350
  const gpad = 40
  const gxMin = parseFloat(xmin) || -10
  const gxMax = parseFloat(xmax) || 10
  const gxRange = gxMax - gxMin || 1

  const graphYBounds = useMemo(() => {
    const yVals: number[] = [0]
    for (const f of functions) {
      for (let i = 0; i <= 100; i++) {
        const x = gxMin + (i / 100) * gxRange
        try {
          const y = f.fn(x)
          if (Number.isFinite(y) && Math.abs(y) < 1e6) yVals.push(y)
        } catch {
          // skip
        }
      }
    }
    const yMin = Math.min(...yVals)
    const yMax = Math.max(...yVals)
    if (yMin === yMax) return { yMin: yMin - 1, yMax: yMax + 1 }
    return { yMin, yMax }
  }, [functions, gxMin, gxMax, gxRange])

  const toGraphX = (x: number) => gpad + ((x - gxMin) / gxRange) * (graphWidth - 2 * gpad)
  const toGraphY = (y: number) =>
    graphHeight -
    gpad -
    ((y - graphYBounds.yMin) / (graphYBounds.yMax - graphYBounds.yMin || 1)) *
      (graphHeight - 2 * gpad)

  const graphPaths = useMemo(() => {
    return functions.map((f) => {
      const segments: string[] = []
      const points: string[] = []
      for (let i = 0; i <= 300; i++) {
        const x = gxMin + (i / 300) * gxRange
        try {
          const y = f.fn(x)
          if (Number.isFinite(y) && Math.abs(y) < 1e6) {
            if (points.length === 0 && segments.length > 0) {
              points.push(`M${toGraphX(x).toFixed(2)},${toGraphY(y).toFixed(2)}`)
            } else if (points.length === 0) {
              points.push(`M${toGraphX(x).toFixed(2)},${toGraphY(y).toFixed(2)}`)
            } else {
              points.push(`L${toGraphX(x).toFixed(2)},${toGraphY(y).toFixed(2)}`)
            }
          } else {
            if (points.length > 0) {
              segments.push(points.join(''))
              points.length = 0
            }
          }
        } catch {
          if (points.length > 0) {
            segments.push(points.join(''))
            points.length = 0
          }
        }
      }
      if (points.length > 0) segments.push(points.join(''))
      return segments.join(' ')
    })
  }, [functions, gxMin, gxMax, gxRange, graphYBounds])

  const xTicks = useMemo(() => {
    const ticks: number[] = []
    const step = gxRange / 10
    for (let i = 0; i <= 10; i++) {
      ticks.push(gxMin + i * step)
    }
    return ticks
  }, [gxMin, gxRange])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const step = (graphYBounds.yMax - graphYBounds.yMin) / 5
    for (let i = 0; i <= 5; i++) {
      ticks.push(graphYBounds.yMin + i * step)
    }
    return ticks
  }, [graphYBounds])

  const chartData = useMemo(() => {
    if (functions.length === 0) return []
    const n = Math.min(20, Math.max(1, Math.round(gxRange / (sampleStep || 1))))
    const data: { label: string; value: number }[] = []
    for (let i = 0; i <= n; i++) {
      const x = gxMin + (i / n) * gxRange
      let maxAbs = 0
      for (const f of functions) {
        try {
          const y = f.fn(x)
          if (Number.isFinite(y)) maxAbs = Math.max(maxAbs, Math.abs(y))
        } catch {
          // skip
        }
      }
      data.push({ label: parseFloat(x.toFixed(1)).toString(), value: Math.round(maxAbs * 100) / 100 })
    }
    return data
  }, [functions, gxMin, gxRange, sampleStep])

  return (
    <AppShell
      name="Graphing Calculator"
      icon="docs"
      hue="green"
      category="Productivity"
      meta={`${functions.length} ${functions.length === 1 ? 'function' : 'functions'}`}
      status={`Window ${gxMin} to ${gxMax} · ${functions.length} plotted`}
      side={
        <Rail
          title="View window"
          chips={[
            `x ${gxMin} to ${gxMax}`,
            `y ${Math.round(graphYBounds.yMin)} to ${Math.round(graphYBounds.yMax)}`,
            `${functions.length} ${functions.length === 1 ? 'curve' : 'curves'}`,
          ]}
        >
          <Checkbox label="Show grid" checked={showGrid} onChange={setShowGrid} />
          <Keys items={[['G', 'Toggle grid'], ['E', 'Export PNG']]} />
        </Rail>
      }
    >
      <Card mono="New" title="Plot a function">
        <FormGrid>
          <TextInput
            label="Function expression"
            value={expression}
            onChange={setExpression}
            error={error}
            placeholder="e.g. x^2, 2x + 1, sin(x)"
          />
          <TextInput label="X min" value={xmin} onChange={handleXminChange} />
          <TextInput label="X max" value={xmax} onChange={handleXmaxChange} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={plot}>Plot function</PrimaryButton>
          <Button kind="secondary" onClick={exportPng} disabled={functions.length === 0}>
            Export PNG
          </Button>
          {functions.length > 0 && (
            <ExportMenu
              options={exportMenuOptions}
              fileName="graph"
              ariaLabel="More export formats"
            />
          )}
        </Actions>
      </Card>

      <div className="lc-tabs" role="tablist" aria-label="View">
        {(['Graph', 'Table'] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={`lc-tab gc-tab${tab === item ? ' active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Graph' && (
        <Card mono="View" title="Graph">
          {functions.length === 0 ? (
            <div className="lc-body-sm gc-faint">Nothing to plot yet.</div>
          ) : (
            <>
              <div className="gc-graph-style-row">
                {(['line', 'chart'] as GraphStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={`lc-tab gc-tab${graphStyle === style ? ' active' : ''}`}
                    onClick={() => setGraphStyle(style)}
                  >
                    {style === 'line' ? 'Line plot' : 'Magnitude chart'}
                  </button>
                ))}
              </div>
              {graphStyle === 'line' ? (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <svg
                    width="100%"
                    viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                    style={{ display: 'block', maxWidth: '100%' }}
                    aria-label={`Graph of ${functions.map((f) => f.expression).join(', ')}`}
                  >
                    <rect width={graphWidth} height={graphHeight} fill="var(--paper)" rx="4" />
                    {showGrid && xTicks.map((x, i) => (
                      <g key={`xt${i}`}>
                        <line
                          x1={toGraphX(x)}
                          y1={gpad}
                          x2={toGraphX(x)}
                          y2={graphHeight - gpad}
                          stroke="var(--ui-line)"
                          strokeWidth="1"
                        />
                        <text
                          x={toGraphX(x)}
                          y={graphHeight - gpad + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fill="var(--ink-60)"
                        >
                          {parseFloat(x.toFixed(1)).toString()}
                        </text>
                      </g>
                    ))}
                    {showGrid && yTicks.map((y, i) => (
                      <g key={`yt${i}`}>
                        <line
                          x1={gpad}
                          y1={toGraphY(y)}
                          x2={graphWidth - gpad}
                          y2={toGraphY(y)}
                          stroke="var(--ui-line)"
                          strokeWidth="1"
                        />
                        <text
                          x={gpad - 6}
                          y={toGraphY(y) + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="var(--ink-60)"
                        >
                          {parseFloat(y.toFixed(1)).toString()}
                        </text>
                      </g>
                    ))}
                    {gxMin <= 0 && gxMax >= 0 && (
                      <line
                        x1={toGraphX(0)}
                        y1={gpad}
                        x2={toGraphX(0)}
                        y2={graphHeight - gpad}
                        stroke="var(--ink-40)"
                        strokeWidth="1.5"
                      />
                    )}
                    {graphYBounds.yMin <= 0 && graphYBounds.yMax >= 0 && (
                      <line
                        x1={gpad}
                        y1={toGraphY(0)}
                        x2={graphWidth - gpad}
                        y2={toGraphY(0)}
                        stroke="var(--ink-40)"
                        strokeWidth="1.5"
                      />
                    )}
                    {graphPaths.map((d, i) =>
                      d ? (
                        <path key={i} d={d} fill="none" stroke={functions[i].color} strokeWidth="2.5" />
                      ) : null,
                    )}
                  </svg>
                </div>
              ) : (
                <Chart
                  type="line"
                  title="Peak magnitude across window"
                  data={chartData}
                  ariaLabel={`Magnitude chart of ${functions.map((f) => f.expression).join(', ')}`}
                />
              )}
            </>
          )}
        </Card>
      )}

      {tab === 'Table' && (
        <Card mono="Values" title="Sampled values">
          {functions.length === 0 ? null : (
            <>
              <div className="gc-table-controls">
                <NumberInput
                  label="Sample step"
                  value={sampleStep}
                  onChange={(v) => setSampleStep(v ?? 1)}
                  min={0.1}
                  max={100}
                  step={0.1}
                  unit="x"
                />
                <Button kind="secondary" onClick={copyCsv} disabled={functions.length === 0}>
                  {clipboard.copied ? 'Copied' : 'Copy CSV'}
                </Button>
              </div>
              <Table
                label="Sampled values"
                columns={tableColumns}
                rows={tableRows}
                empty="No rows in the current window"
              />
            </>
          )}
        </Card>
      )}

      <Card mono={`${functions.length} plotted`} title="Functions">
        {functions.length === 0 ? (
          <EmptyState
            title="No functions plotted yet"
            detail="Type an expression and plot it to get started."
            actionLabel="Plot a function"
            onAction={plot}
          />
        ) : (
          <List label="Functions">
            {functions.map((f) => (
              <Row
                key={f.id}
                title={f.expression}
                action={
                  <Button kind="ghost" ariaLabel={`Delete ${f.expression}`} onClick={() => remove(f.id)}>
                    Delete {f.expression}
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
