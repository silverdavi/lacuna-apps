import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, List, Row, Stack } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { LINE_COLORS, DEFAULT_LINE_COLOR } from './colors'

const CANVAS_SIZE = 640
const MIN_POINTS = 4
const DEFAULT_POINTS = 8
const DEFAULT_STEP = 3

interface Pattern {
  points: number
  step: number
  color: string
}

interface HistoryEntry {
  id: string
  points: number
  step: number
  color: string
}

function historyId(at: number): string {
  return `${at}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveColor(color: string): string {
  if (color && color !== 'black') return color
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  return accent || DEFAULT_LINE_COLOR
}

function drawPattern(canvas: HTMLCanvasElement, points: number, step: number, color: string): void {
  canvas.width = CANVAS_SIZE
  canvas.height = CANVAS_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const angle = (2 * Math.PI) / points
  const positions: Array<{ x: number; y: number }> = []
  for (let i = 0; i < points; i++) {
    positions.push({
      x: CANVAS_SIZE / 2 + CANVAS_SIZE * 0.42 * Math.cos(i * angle - Math.PI / 2),
      y: CANVAS_SIZE / 2 + CANVAS_SIZE * 0.42 * Math.sin(i * angle - Math.PI / 2),
    })
  }
  ctx.strokeStyle = color
  ctx.lineWidth = 0.5
  let j = 0
  for (let i = 0; i < points; i++) {
    const a = positions[i]
    if (!a) continue
    j = (j + step) % points
    const b = positions[j]
    if (!b) continue
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }
}

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const view = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    view[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<{ pattern: Pattern | null; history: HistoryEntry[] }>({
    key: 'string-art.pattern',
    version: 1,
    defaultValue: { pattern: null, history: [] },
  })

  const [points, setPoints] = useState<number>(record.pattern ? record.pattern.points : DEFAULT_POINTS)
  const [step, setStep] = useState<number>(record.pattern ? record.pattern.step : DEFAULT_STEP)
  const [color, setColor] = useState<string>(record.pattern ? record.pattern.color || DEFAULT_LINE_COLOR : DEFAULT_LINE_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'Design' | 'History'>('Design')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const pattern = record.pattern
  const history = record.history

  useEffect(() => {
    if (error === null) return
    const t = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(t)
  }, [error])

  useEffect(() => {
    if (record.pattern) {
      setPoints(record.pattern.points)
      setStep(record.pattern.step)
      setColor(record.pattern.color || DEFAULT_LINE_COLOR)
    }
  }, [record.pattern])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      drawPattern(canvas, points, step, resolveColor(color))
    } catch {
      // repaint skipped
    }
  }, [points, step, color])

  function generate() {
    if (points < MIN_POINTS) {
      setError(`Minimum ${MIN_POINTS} points required`)
      return
    }
    const resolved = resolveColor(color)
    const nextPattern: Pattern = { points, step, color: resolved }
    setRecord((prev) => ({
      pattern: nextPattern,
      history: [{ id: historyId(Date.now()), points, step, color: resolved }, ...prev.history].slice(0, 20),
    }))
    setError(null)
  }

  function clearAll() {
    setRecord((prev) => ({ pattern: null, history: prev.history }))
    setPoints(DEFAULT_POINTS)
    setStep(DEFAULT_STEP)
    setColor(DEFAULT_LINE_COLOR)
    setError(null)
  }

  function exportPng() {
    const current = pattern
    if (!current) return
    try {
      const canvas = document.createElement('canvas')
      drawPattern(canvas, current.points, current.step, resolveColor(current.color))
      const dataUrl = canvas.toDataURL('image/png')
      const blob = dataUrlToBlob(dataUrl, 'image/png')
      saveBlob(blob, { filename: 'string-art.png', mimeType: 'image/png' })
    } catch {
      setError('Export failed')
    }
  }

  function copySettings() {
    if (!pattern) return
    void copy(`String Art: ${pattern.points} points, step ${pattern.step}, color ${resolveColor(pattern.color)}`)
  }

  const lineCount = pattern ? pattern.points : 0

  function deleteHistory(id: string) {
    setRecord((prev) => ({ pattern: prev.pattern, history: prev.history.filter((h) => h.id !== id) }))
  }

  return (
    <AppShell
      name="String Art Generator"
      icon="design"
      hue="rust"
      category="Productivity"
      meta={pattern ? `${pattern.points} pts · step ${pattern.step}` : 'Set points'}
      status="Local · no network"
      side={
        <div>
          <p style={{ margin: 0, fontSize: 'calc(13px * var(--tf))' }}>Geometric string art from a ring of points. Set the count, the step, and the color, then export as PNG. Patterns persist on this device.</p>
        </div>
      }
    >
      <Stack lg>
        {error ? (
          <div style={{ padding: 'calc(8px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--danger)', fontSize: 'calc(13px * var(--tf))' }}>
            {error}
          </div>
        ) : null}

        <div role="tablist" style={{ display: 'flex', gap: 'calc(4px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
          <button
            type="button"
            role="tab"
            id="tab-design"
            aria-selected={tab === 'Design'}
            aria-controls="panel-design"
            onClick={() => setTab('Design')}
            style={{
              padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
              border: 'none',
              borderBottom: tab === 'Design' ? 'calc(2px * var(--sf)) solid var(--accent)' : 'calc(2px * var(--sf)) solid transparent',
              background: 'transparent',
              color: tab === 'Design' ? 'var(--accent)' : 'var(--ink)',
              cursor: 'pointer',
              fontSize: 'calc(13px * var(--tf))',
              fontWeight: 500,
            }}
          >
            Design
          </button>
          <button
            type="button"
            role="tab"
            id="tab-history"
            aria-selected={tab === 'History'}
            aria-controls="panel-history"
            onClick={() => setTab('History')}
            style={{
              padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
              border: 'none',
              borderBottom: tab === 'History' ? 'calc(2px * var(--sf)) solid var(--accent)' : 'calc(2px * var(--sf)) solid transparent',
              background: 'transparent',
              color: tab === 'History' ? 'var(--accent)' : 'var(--ink)',
              cursor: 'pointer',
              fontSize: 'calc(13px * var(--tf))',
              fontWeight: 500,
            }}
          >
            History
          </button>
        </div>

        <div
          role="tabpanel"
          id={tab === 'Design' ? 'panel-design' : 'panel-history'}
          aria-labelledby={tab === 'Design' ? 'tab-design' : 'tab-history'}
        >
          {tab === 'Design' ? (
            <Stack lg>
              <Card mono="Canvas" title="Pattern">
                {!pattern ? (
                  <EmptyState mono="Empty" title="No pattern generated yet" detail="Set the points, step, and color, then click Generate." />
                ) : (
                  <Stack>
                    <div style={{ width: '100%', maxWidth: 'calc(640px * var(--sf))', margin: '0 auto' }}>
                      <canvas
                        ref={(el) => {
                          canvasRef.current = el
                        }}
                        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '1 / 1', border: 'calc(1px * var(--sf)) solid var(--ink)' }}
                      />
                    </div>
                    <p style={{ margin: 0, textAlign: 'center', fontSize: 'calc(13px * var(--tf))' }}>Pattern ready</p>
                  </Stack>
                )}
              </Card>

              <Card mono="Settings" title="Parameters">
                <FormGrid>
                  <div>
                    <label htmlFor="points" style={{ display: 'block', fontSize: 'calc(13px * var(--tf))', marginBottom: 'calc(4px * var(--sf))' }}>
                      Points
                    </label>
                    <input
                      id="points"
                      type="range"
                      min={1}
                      max={36}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      aria-label="Points"
                      style={{ width: '100%' }}
                    />
                    <span style={{ fontSize: 'calc(11px * var(--tf))', display: 'block', marginTop: 'calc(2px * var(--sf))' }}>{points}</span>
                  </div>
                  <div>
                    <label htmlFor="step" style={{ display: 'block', fontSize: 'calc(13px * var(--tf))', marginBottom: 'calc(4px * var(--sf))' }}>
                      Step
                    </label>
                    <input
                      id="step"
                      type="range"
                      min={1}
                      max={35}
                      value={step}
                      onChange={(e) => setStep(Number(e.target.value))}
                      aria-label="Step"
                      style={{ width: '100%' }}
                    />
                    <span style={{ fontSize: 'calc(11px * var(--tf))', display: 'block', marginTop: 'calc(2px * var(--sf))' }}>{step}</span>
                  </div>
                  <div>
                    <label htmlFor="color" style={{ display: 'block', fontSize: 'calc(13px * var(--tf))', marginBottom: 'calc(4px * var(--sf))' }}>
                      Color
                    </label>
                    <input
                      id="color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      aria-label="Color"
                      style={{ width: '100%', height: 'calc(32px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}
                    />
                  </div>
                </FormGrid>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
                  {LINE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Color ${i + 1}`}
                      onClick={() => setColor(c)}
                      style={{
                        width: 'calc(24px * var(--sf))',
                        height: 'calc(24px * var(--sf))',
                        border: color === c ? 'calc(2px * var(--sf)) solid var(--accent)' : 'calc(1px * var(--sf)) solid var(--ui-line2)',
                        backgroundColor: c,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </Card>

              {pattern ? (
                <Card mono="Stats" title="Pattern info">
                  <KpiRow>
                    <Kpi value={String(pattern.points)} label="Points" />
                    <Kpi value={String(pattern.step)} label="Step" />
                    <Kpi value={String(lineCount)} label="Lines" accent />
                  </KpiRow>
                </Card>
              ) : null}

              <Card mono="Actions" title="Generate & export">
                <Actions>
                  <Button kind="primary" onClick={generate}>Generate</Button>
                  <Button kind="ink" onClick={exportPng} disabled={!pattern}>
                    Export PNG
                  </Button>
                  <Button kind="ghost" onClick={copySettings} disabled={!pattern}>
                    {copied ? 'Copied' : 'Copy settings'}
                  </Button>
                  <Button kind="ghost" onClick={clearAll} disabled={!pattern}>
                    Clear
                  </Button>
                </Actions>
              </Card>
            </Stack>
          ) : (
            <Card mono="History" title="Past patterns">
              {history.length === 0 ? (
                <EmptyState mono="Empty" title="No patterns in history" detail="Generate a pattern and it lands here, on this device." />
              ) : (
                <List>
                  {history.map((h) => (
                    <Row key={h.id} title={`${h.points} points, step ${h.step}`} meta={h.color} action={
                      <Button kind="ghost" onClick={() => deleteHistory(h.id)}>
                        Delete
                      </Button>
                    } />
                  ))}
                </List>
              )}
            </Card>
          )}
        </div>
      </Stack>
    </AppShell>
  )
}
