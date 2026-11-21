import { useEffect, useRef, useState } from 'react'
import { RangeSlider } from '@lacuna/range-slider'
import { AppShell, Body, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
import { ERASER_STROKE, SKETCH_STROKE, SWATCHES } from './colors'
import { host } from './host'
import './app.css'

const CANVAS_W = 900
const CANVAS_H = 560
const MIN = 8
const MAX = 96

function drawDefaultSketch(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 10
  ctx.strokeStyle = SKETCH_STROKE
  ctx.beginPath()
  ctx.moveTo(40, 40)
  ctx.lineTo(160, 40)
  ctx.stroke()
  ctx.restore()
}

type Tool = 'brush' | 'eraser'

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const undoStackRef = useRef<ImageData[]>([])
  const redoStackRef = useRef<ImageData[]>([])
  const pristineRef = useRef<ImageData | null>(null)

  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState<string>(SWATCHES[1].color)
  const [size, setSize] = useState(32)

  const toolRef = useRef(tool)
  const colorRef = useRef(color)
  const sizeRef = useRef(size)

  useEffect(() => {
    toolRef.current = tool
  }, [tool])
  useEffect(() => {
    colorRef.current = color
  }, [color])
  useEffect(() => {
    sizeRef.current = size
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctxRef.current = ctx

    const record = host.loadPaint()
    if (record?.pixels) {
      host.applyRecordToCanvas(canvas, record)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawDefaultSketch(ctx)
    }
    const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
    undoStackRef.current = [snap]
    pristineRef.current = snap
  }, [])

  const persist = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const record = host.recordFromCanvas(canvas)
    host.savePaint(record)
  }

  const pushHistory = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    redoStackRef.current = []
  }

  const restore = (snapshot: ImageData) => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    ctx.putImageData(snapshot, 0, 0)
    persist()
  }

  const undo = () => {
    const stack = undoStackRef.current
    if (stack.length <= 1) return
    const current = ctxRef.current?.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    if (current) redoStackRef.current.push(current)
    restore(stack.pop()!)
  }

  const redo = () => {
    const stack = redoStackRef.current
    if (stack.length === 0) return
    const current = ctxRef.current?.getImageData(0, 0, canvasRef.current!.width, canvasRef.current!.height)
    if (current) undoStackRef.current.push(current)
    restore(stack.pop()!)
  }

  const pointFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const strokeTo = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = sizeRef.current
    if (toolRef.current === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = ERASER_STROKE
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = colorRef.current
    }
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointFromEvent(e)
    if (!p) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pushHistory()
    drawingRef.current = true
    lastRef.current = p
    strokeTo(p, p)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastRef.current) return
    const p = pointFromEvent(e)
    if (!p) return
    strokeTo(lastRef.current, p)
    lastRef.current = p
  }

  const onPointerUp = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastRef.current = null
    persist()
  }

  const onClear = () => {
    const pristine = pristineRef.current
    if (!pristine) return
    pushHistory()
    restore(pristine)
  }

  const onExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.download = `paint-${date}.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppShell
      name="Paint"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta="Local · no network"
      status="Saved on this device"
    >
      <Card flush>
        <Stack>
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
          <Body sm>
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
                    key={swatch.label}
                    type="button"
                    className="paint-swatch"
                    style={{ background: swatch.color }}
                    aria-pressed={color === swatch.color}
                    aria-label={swatch.label}
                    onClick={() => setColor(swatch.color)}
                  />
                ))}
              </div>
            </div>
            <RangeSlider label="Size" value={size} onChange={setSize} min={MIN} max={MAX} step={1} />
            <div className="paint-actions">
              <Button onClick={undo}>Undo</Button>
              <Button onClick={redo}>Redo</Button>
              <Button onClick={onClear}>Clear</Button>
              <Button kind="primary" onClick={onExport}>
                Export PNG
              </Button>
            </div>
          </div>
        </Stack>
      </Card>
    </AppShell>
  )
}
