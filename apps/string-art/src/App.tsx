import { useEffect, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Stack } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'
import { DEFAULT_LINE_COLOR } from './colors'

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
}

function historyId(at: number): string {
  return `${at}-${Math.random().toString(36).slice(2, 8)}`
}

function resolveColor(color: string): string {
  if (color) return color
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

function blobFromCanvas(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('could not encode image'))
      }, type)
    } catch {
      reject(new Error('could not encode image'))
    }
  })
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<{ pattern: Pattern | null; history: HistoryEntry[] }>({
    key: 'string-art.pattern',
    version: 1,
    defaultValue: { pattern: null, history: [] },
  })

  const [points, setPoints] = useState<number>(DEFAULT_POINTS)
  const [step, setStep] = useState<number>(DEFAULT_STEP)
  const [color, setColor] = useState<string>(DEFAULT_LINE_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'Design' | 'History'>('Design')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const pattern = record.pattern
  const history = record.history

  useEffect(() => {
    if (record.pattern) {
      setPoints(record.pattern.points)
      setStep(record.pattern.step)
      setColor(record.pattern.color || DEFAULT_LINE_COLOR)
    }
  }, [record.pattern])

  useEffect(() => {
    if (error === null) return
    const t = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(t)
  }, [error])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pattern) return
    try {
      drawPattern(canvas, pattern.points, pattern.step, resolveColor(pattern.color))
    } catch {
      // repaint skipped
    }
  }, [pattern])

  function generate() {
    if (points < MIN_POINTS) {
      setError(`Minimum ${MIN_POINTS} points required`)
      return
    }
    const resolved = resolveColor(color)
    const nextPattern: Pattern = { points, step, color: resolved }
    setRecord((prev) => ({
      pattern: nextPattern,
      history: [{ id: historyId(Date.now()), points, step }, ...prev.history],
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

  async function exportPng() {
    const current = pattern
    if (!current) return
    try {
      const canvas = document.createElement('canvas')
      drawPattern(canvas, current.points, current.step, resolveColor(current.color))
      const blob = await blobFromCanvas(canvas, 'image/png')
      saveBlob(blob, { filename: 'string-art.png', mimeType: 'image/png' })
    } catch {
      setError('Export failed')
    }
  }

  function deleteHistory(id: string) {
    setRecord((prev) => ({ pattern: prev.pattern, history: prev.history.filter((h) => h.id !== id) }))
  }

  return (
    <AppShell
      name="String Art Generator"
      icon="design"
      hue="blue"
      category="Productivity"
      status="Local · no network"
    >
      <Stack lg>
        {error ? (
          <p className="lc-body" style={{ margin: 0, padding: 'calc(8px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(4px * var(--sf))' }}>
            {error}
          </p>
        ) : null}

        <div className="string-art-tabs" role="tablist">
          {(['Design', 'History'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`string-art-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Design' ? (
          <Stack lg>
            <Card title="Pattern">
              {pattern ? (
                <Stack>
                  <div style={{ width: '100%', maxWidth: 'calc(640px * var(--sf))', margin: '0 auto' }}>
                    <canvas
                      ref={(el) => {
                        canvasRef.current = el
                      }}
                      style={{ display: 'block', width: '100%', height: 'auto', border: 'calc(1px * var(--sf)) solid var(--hair-strong)' }}
                    />
                  </div>
                  <p className="lc-body" style={{ margin: 0, textAlign: 'center' }}>
                    Pattern ready
                  </p>
                </Stack>
              ) : (
                <EmptyState title="No pattern generated yet" detail="Set the points, step, and color, then click Generate." />
              )}
            </Card>

            <Card title="Settings">
              <FormGrid>
                <div>
                  <label htmlFor="points" className="lc-label">
                    Points
                  </label>
                  <input
                    id="points"
                    type="range"
                    min="1"
                    max="36"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    aria-label="Points"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label htmlFor="step" className="lc-label">
                    Step
                  </label>
                  <input
                    id="step"
                    type="range"
                    min="1"
                    max="35"
                    value={step}
                    onChange={(e) => setStep(Number(e.target.value))}
                    aria-label="Step"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label htmlFor="color" className="lc-label">
                    Color
                  </label>
                  <input
                    id="color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label="Color"
                    style={{ width: '100%', height: 'calc(32px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--hair-strong)', borderRadius: 'calc(4px * var(--sf))' }}
                  />
                </div>
              </FormGrid>
            </Card>

            <Card title="Actions">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))', alignItems: 'center' }}>
                <Button kind="primary" onClick={generate}>
                  Generate
                </Button>
                <Button kind="ink" onClick={() => void exportPng()} disabled={!pattern}>
                  Export PNG
                </Button>
                <Button kind="ghost" onClick={clearAll} disabled={!pattern}>
                  Clear
                </Button>
              </div>
            </Card>
          </Stack>
        ) : (
          <Card title="History">
            {history.length === 0 ? (
              <EmptyState title="No patterns in history" detail="Generate a pattern and it lands here, on this device." />
            ) : (
              <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {history.map((h) => (
                  <li
                    key={h.id}
                    role="listitem"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(8px * var(--sf)) 0', borderBottom: 'calc(1px * var(--sf)) solid var(--hair)' }}
                  >
                    <span className="lc-body">{h.points} points, step {h.step}</span>
                    <Button kind="ghost" onClick={() => deleteHistory(h.id)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
