// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useLayoutEffect, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  AppShell,
  Actions,
  Body,
  Button,
  Card,
  Select,
  Stack,
  Rail,
  Tag,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { encodeCanvas } from '@lacuna/image-ops'
import { BeforeAfter } from '@lacuna/before-after'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { Stroke, StrokePoint } from './host'
import { saveSession } from './host'
import { INK_SWATCHES } from './colors'

const PAD_W = 480
const PAD_H = 220
const MIN_WIDTH = 1
const MAX_WIDTH = 20

const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || name

const resolveInk = (value: string): string =>
  value === 'ink' ? cssVar('--ink') : value

function paintAll(ctx: CanvasRenderingContext2D, strokes: Stroke[]): void {
  ctx.clearRect(0, 0, PAD_W, PAD_H)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue
    ctx.strokeStyle = resolveInk(stroke.color)
    ctx.lineWidth = stroke.width
    ctx.beginPath()
    const first = stroke.points[0]
    if (!first) continue
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < stroke.points.length; i++) {
      const p = stroke.points[i]
      if (!p) continue
      ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
}

function strokeSeg(ctx: CanvasRenderingContext2D, from: StrokePoint, to: StrokePoint, stroke: Stroke): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = resolveInk(stroke.color)
  ctx.lineWidth = stroke.width
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

interface RecordShape {
  strokes: Stroke[]
  color: string
  width: number
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<StrokePoint | null>(null)
  const activeRef = useRef<Stroke | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const colorRef = useRef<string>('ink')
  const widthRef = useRef<number>(3)

  // useLocalRecord is the authoritative record; it is what survives a reload.
  const { value: record, set: setRecord } = useLocalRecord<RecordShape>({
    key: 'signature-pad.session',
    version: 1,
    defaultValue: { strokes: [], color: 'ink', width: 3 },
  })

  const [strokes, setStrokes] = useState<Stroke[]>(record.strokes)
  const [color, setColor] = useState<string>(record.color)
  const [width, setWidth] = useState<number>(record.width)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const undoStackRef = useRef<Stroke[]>([])
  const redoStackRef = useRef<Stroke[]>([])
  const clipboard = useClipboard({ timeoutMs: 1600 })

  // Keep the ref mirrors in sync so synchronous handlers always draw the
  // current values.
  useEffect(() => {
    strokesRef.current = strokes
    colorRef.current = color
    widthRef.current = width
  }, [strokes, color, width])

  // Paint the canvas on mount so a restored session is visible immediately.
  useLayoutEffect(() => {
    const ctx = ctxRef.current ?? canvasRef.current?.getContext('2d') ?? null
    if (!ctx) return
    ctxRef.current = ctx
    paintAll(ctx, strokes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist through the host boundary (host-mock) and the local record
  // (use-local-record) so a reload restores the session. Done synchronously
  // inside the state-changing handlers so the record is written before any
  // reload, rather than deferred to an effect that a reload can preempt.
  const persist = useCallback(
    (next: { strokes: Stroke[]; color: string; width: number }) => {
      saveSession(next)
      setRecord(next)
    },
    [setRecord],
  )

  useEffect(() => {
    if (toast === null) return
    const t = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(t)
  }, [toast])

  const hasInk = strokes.length > 0

  const commit = useCallback((s: Stroke) => {
    const prev = strokesRef.current
    const next = [...prev, s]
    strokesRef.current = next
    undoStackRef.current = [...undoStackRef.current, ...prev]
    redoStackRef.current = []
    setCanUndo(true)
    setCanRedo(false)
    setStrokes(next)
    persist({ strokes: next, color: colorRef.current, width: widthRef.current })
    const ctx = ctxRef.current
    if (ctx) paintAll(ctx, next)
  }, [persist])

  const pointFromEvent = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const p = pointFromEvent(e)
    if (!p) return
    canvasRef.current?.setPointerCapture(e.pointerId)
    const stroke: Stroke = { color: colorRef.current, width: widthRef.current, points: [p] }
    activeRef.current = stroke
    drawingRef.current = true
    lastRef.current = p
    if (ctxRef.current) strokeSeg(ctxRef.current, p, p, stroke)
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = ctxRef.current
    const stroke = activeRef.current
    const last = lastRef.current
    if (!ctx || !stroke || !last) return
    const p = pointFromEvent(e)
    if (!p) return
    if (Math.hypot(p.x - last.x, p.y - last.y) < 1) return
    lastRef.current = p
    stroke.points.push(p)
    strokeSeg(ctx, last, p, stroke)
  }

  const endStroke = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    const cur = activeRef.current
    lastRef.current = null
    activeRef.current = null
    if (cur && cur.points.length > 0) commit(cur)
  }

  const undo = () => {
    if (strokesRef.current.length === 0) return
    const removed = strokesRef.current[strokesRef.current.length - 1]
    if (!removed) return
    const next = strokesRef.current.slice(0, -1)
    strokesRef.current = next
    redoStackRef.current = [...redoStackRef.current, removed]
    setCanRedo(true)
    setCanUndo(strokesRef.current.length > 0)
    setStrokes(next)
    persist({ strokes: next, color: colorRef.current, width: widthRef.current })
    const ctx = ctxRef.current
    if (ctx) paintAll(ctx, next)
  }

  const redo = () => {
    const removed = redoStackRef.current[redoStackRef.current.length - 1]
    if (!removed) return
    redoStackRef.current = redoStackRef.current.slice(0, -1)
    const all = [...strokesRef.current, removed]
    strokesRef.current = all
    setCanRedo(redoStackRef.current.length > 0)
    setCanUndo(true)
    setStrokes(all)
    persist({ strokes: all, color: colorRef.current, width: widthRef.current })
    const ctx = ctxRef.current
    if (ctx) paintAll(ctx, all)
  }

  const clearAll = () => {
    if (strokesRef.current.length === 0) return
    undoStackRef.current = [...undoStackRef.current, ...strokesRef.current]
    redoStackRef.current = []
    strokesRef.current = []
    setCanUndo(true)
    setCanRedo(false)
    setStrokes([])
    activeRef.current = null
    persist({ strokes: [], color: colorRef.current, width: widthRef.current })
    const ctx = ctxRef.current
    if (ctx) paintAll(ctx, [])
  }

  async function savePng() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await encodeCanvas(canvas, { format: 'image/png' })
      saveBlob(blob, { filename: 'signature.png', mimeType: 'image/png' })
      setToast('Signature saved')
    } catch {
      setToast('Could not save the signature')
    }
  }

  async function copyPng() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const blob = await encodeCanvas(canvas, { format: 'image/png' })
      await clipboard.copy(blob)
      setToast('Copied to clipboard')
    } catch {
      setToast('Could not copy the signature')
    }
  }

  const blank = () => {
    const c = document.createElement('canvas')
    c.width = PAD_W
    c.height = PAD_H
    return c.toDataURL('image/png')
  }

  const currentPng = canvasRef.current?.toDataURL('image/png') ?? blank()

  const status =
    toast ??
    (clipboard.copied
      ? 'Copied to clipboard'
      : hasInk
        ? `${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'} · local · no network`
        : 'Local · no network')

  return (
    <AppShell
      name="Signature Pad"
      icon="signature"
      hue="rust"
      category="Productivity"
      meta={`${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}`}
      status={status}
      side={
        <Rail
          title="Signature Pad"
          note="Draw · undo · save PNG"
          chips={['Canvas', 'Undo / Redo', 'Works offline']}
        >
          <BeforeAfter
            mode="side-by-side"
            ariaLabel="Blank pad and current signature"
            before={<img alt="Blank pad" style={{ display: 'block', width: '100%', height: 'auto' }} src={blank()} />}
            after={<img alt="Current signature" style={{ display: 'block', width: '100%', height: 'auto' }} src={currentPng} />}
          />
        </Rail>
      }
    >
      <Card
        mono="Draw"
        title="Signature Pad"
        actions={hasInk ? <Tag accent>Signature ready</Tag> : null}
      >
        <Stack>
          <div className="sig-canvas">
          <canvas
            ref={canvasRef}
            width={PAD_W}
            height={PAD_H}
            role="img"
            aria-label="Signature canvas"
            style={{
              display: 'block',
              width: 'calc(480px * var(--sf))',
              height: 'calc(220px * var(--sf))',
              background: 'var(--paper)',
              border: 'calc(1px * var(--sf)) solid var(--hair)',
              borderRadius: 'calc(3px * var(--sf))',
              touchAction: 'none',
              cursor: 'crosshair',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={endStroke}
            onPointerLeave={endStroke}
          />
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(16px * var(--sf))',
              alignItems: 'center',
            }}
          >
            <Select
              label="Stroke color"
              value={color}
               onChange={(v) => {
                 colorRef.current = v
                 setColor(v)
                 persist({ strokes: strokesRef.current, color: v, width: widthRef.current })
               }}
              options={INK_SWATCHES.map((s) => ({ value: s.value, label: s.label }))}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--mono)',
                   fontSize: 'calc(10px * var(--tf))',
                   letterSpacing: 'calc(-0.01em * var(--tf))',
                   textTransform: 'uppercase',
                  color: 'var(--ink-60)',
                }}
              >
                Stroke width
              </span>
              <input
                type="range"
                min={MIN_WIDTH}
                max={MAX_WIDTH}
                step={1}
                value={width}
                aria-label="Stroke width"
                 onChange={(e) => {
                   const v = Number(e.target.value)
                   widthRef.current = v
                   setWidth(v)
                   persist({ strokes: strokesRef.current, color: colorRef.current, width: v })
                 }}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(13px * var(--tf))',
                  color: 'var(--ink)',
                }}
              >
                {width}
              </span>
            </label>
          </div>
          <Actions>
            <Button kind="secondary" onClick={clearAll} disabled={!hasInk} ariaLabel="Clear canvas">
              Clear canvas
            </Button>
            <Button kind="secondary" onClick={undo} disabled={!canUndo || strokes.length === 0} ariaLabel="Undo">
              Undo
            </Button>
            <Button kind="secondary" onClick={redo} disabled={!canRedo} ariaLabel="Redo">
              Redo
            </Button>
            <Button kind="primary" onClick={savePng} disabled={!hasInk} ariaLabel="Save PNG">
              Save PNG
            </Button>
            <Button kind="ghost" onClick={copyPng} disabled={!hasInk} ariaLabel="Copy image">
              Copy
            </Button>
          </Actions>
        </Stack>
      </Card>

      <Card mono="Note" title="How it works">
        <Body>
          Every stroke stays on this device. Use Clear canvas to start over,
          Undo and Redo to step through strokes, then Save PNG to download
          signature.png. Pick a color and drag the width slider to set the
          next stroke; your last signature is restored after a reload.
        </Body>
      </Card>
    </AppShell>
  )
}
