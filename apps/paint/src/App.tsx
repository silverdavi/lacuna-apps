import { useCallback, useEffect, useRef, useState } from 'react'
import { Body, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { host, type PaintRecord } from './host'
import './app.css'

const CANVAS_W = 900
const CANVAS_H = 560

const SWATCHES = [
  'rgb(26, 26, 26)',
  'rgb(181, 80, 42)',
  'rgb(74, 90, 158)',
  'rgb(74, 122, 90)',
  'rgb(201, 151, 30)',
  'rgb(124, 111, 232)',
  'rgb(46, 184, 166)',
  'rgb(240, 100, 73)',
] as const

type Tool = 'brush' | 'eraser'

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState<string>(SWATCHES[0])
  const [size, setSize] = useState(6)

  const [history, setHistory] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.getContext('2d')
  }, [])

  const snapshot = useCallback((): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  }, [])

  const restore = useCallback(
    async (dataUrl: string) => {
      const canvas = canvasRef.current
      const ctx = getCtx()
      if (!canvas || !ctx) return
      try {
        const img = await loadImage(dataUrl)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      } catch {
        /* ignore */
      }
    },
    [getCtx],
  )

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [getCtx])

  const persist = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = canvas.toDataURL('image/png')
    const record: PaintRecord = {
      id: 'paint-1',
      image,
      width: canvas.width,
      height: canvas.height,
      savedAt: new Date().toISOString(),
    }
    host.savePaint(record)
  }, [])

  const pushHistory = useCallback(() => {
    const snap = snapshot()
    if (!snap) return
    setHistory((h) => [...h, snap])
    setRedoStack([])
  }, [snapshot])

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h
      const prev = h[h.length - 1]
      const current = snapshot()
      if (current) setRedoStack((r) => [...r, current])
      void restore(prev)
      return h.slice(0, -1)
    })
  }, [restore, snapshot])

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r
      const next = r[r.length - 1]
      const current = snapshot()
      if (current) setHistory((h) => [...h, current])
      void restore(next)
      return r.slice(0, -1)
    })
  }, [restore, snapshot])

  // Load persisted drawing exactly once on mount.
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    const canvas = canvasRef.current
    const ctx = getCtx()
    if (!canvas || !ctx) return
    const record = host.loadPaint()
    if (record) {
      void loadImage(record.image)
        .then((img) => {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
        })
        .catch(() => clearCanvas())
    } else {
      clearCanvas()
    }
  }, [clearCanvas, getCtx])

  // Persist the current canvas after each interaction (debounced via rAF),
  // and again on page unload to survive navigation.
  useEffect(() => {
    if (history.length === 0 && redoStack.length === 0) return
    const id = requestAnimationFrame(persist)
    const onUnload = () => persist()
    window.addEventListener('pagehide', onUnload)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('pagehide', onUnload)
    }
  }, [history, redoStack, persist])

  // Keyboard: Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const pointFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
      }
    },
    [],
  )

  const strokeTo = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = getCtx()
      if (!ctx) return
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = size
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgb(0, 0, 0)'
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = color
      }
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
    },
    [color, getCtx, size, tool],
  )

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const p = pointFromEvent(e)
      if (!p) return
      e.currentTarget.setPointerCapture(e.pointerId)
      pushHistory()
      drawing.current = true
      last.current = p
      strokeTo(p, p)
    },
    [pointFromEvent, pushHistory, strokeTo],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !last.current) return
      const p = pointFromEvent(e)
      if (!p) return
      strokeTo(last.current, p)
      last.current = p
    },
    [pointFromEvent, strokeTo],
  )

  const onPointerUp = useCallback(() => {
    drawing.current = false
    last.current = null
  }, [])

  const onClear = useCallback(() => {
    pushHistory()
    clearCanvas()
  }, [clearCanvas, pushHistory])

  const onExport = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.download = `paint-${date}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [])

  return (
    <main className="paint-app">
      <Card mono="Studio" title="Paint">
        <Stack>
          <Body>
            Pick a brush, a color, and a size. Draw with the mouse, a pen, or a finger. Undo a mistake, clear the
            surface, and export a PNG. The drawing survives a reload.
          </Body>
          <div className="paint-toolbar" role="toolbar" aria-label="Paint tools">
            <div className="paint-tools" role="group" aria-label="Drawing tools">
              <button
                type="button"
                className="paint-tool"
                aria-pressed={tool === 'brush'}
                onClick={() => setTool('brush')}
              >
                Brush
              </button>
              <button
                type="button"
                className="paint-tool"
                aria-pressed={tool === 'eraser'}
                onClick={() => setTool('eraser')}
              >
                Eraser
              </button>
            </div>
            <div className="paint-palette">
              <MonoLabel sm>Color</MonoLabel>
              <div className="paint-swatches" role="group" aria-label="Colors">
                {SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className="paint-swatch"
                    style={{ background: swatch }}
                    aria-pressed={color === swatch}
                    aria-label={`Color ${swatch}`}
                    onClick={() => setColor(swatch)}
                  />
                ))}
              </div>
            </div>
            <label className="paint-size">
              Size
              <input
                type="range"
                min={1}
                max={40}
                step={1}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span>{size}</span>
            </label>
            <div className="paint-actions">
              <Button onClick={undo}>Undo</Button>
              <Button onClick={redo}>Redo</Button>
              <Button onClick={onClear}>Clear</Button>
              <Button kind="primary" onClick={onExport}>
                Export PNG
              </Button>
            </div>
          </div>
          <div className="paint-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="paint-canvas"
              width={CANVAS_W}
              height={CANVAS_H}
              role="img"
              aria-label="Paint surface"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </Stack>
      </Card>
    </main>
  )
}
