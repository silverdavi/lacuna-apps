import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, MonoLabel, Stack, Title } from '@lacuna/ui'
import { host, type PaintRecord } from './host'
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
  ctx.strokeStyle = 'rgb(24, 24, 24)'
  ctx.beginPath()
  ctx.moveTo(40, 40)
  ctx.lineTo(160, 40)
  ctx.stroke()
  ctx.restore()
}

const SWATCHES = [
  { label: 'Black', color: 'rgb(24, 24, 24)' },
  { label: 'Rust', color: 'rgb(181, 80, 42)' },
  { label: 'Indigo', color: 'rgb(74, 90, 158)' },
  { label: 'Moss', color: 'rgb(74, 122, 90)' },
  { label: 'Gold', color: 'rgb(201, 151, 30)' },
  { label: 'Violet', color: 'rgb(124, 111, 232)' },
  { label: 'Teal', color: 'rgb(46, 184, 166)' },
  { label: 'Red', color: 'rgb(235, 61, 49)' },
] as const

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
    if (record?.image) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
        undoStackRef.current = [snap]
        pristineRef.current = snap
      }
      img.src = record.image
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawDefaultSketch(ctx)
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height)
      undoStackRef.current = [snap]
      pristineRef.current = snap
    }
  }, [])

  const persist = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const record: PaintRecord = {
      id: 'paint-1',
      image: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
      savedAt: new Date().toISOString(),
    }
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
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
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
      ctx.strokeStyle = 'rgb(0, 0, 0)'
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
    <main className="paint-app">
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
          <div className="paint-head">
            <MonoLabel sm>Studio</MonoLabel>
            <Title size="md">Paint</Title>
          </div>
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
            <label className="paint-size">
              Size
              <input
                type="range"
                min={MIN}
                max={MAX}
                step={1}
                value={size}
                aria-valuenow={size}
                aria-valuemin={MIN}
                aria-valuemax={MAX}
                aria-label="Size"
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span aria-hidden>{size}</span>
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
        </Stack>
      </Card>
    </main>
  )
}
