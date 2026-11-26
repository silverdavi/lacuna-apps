// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/crop-box 0.1.0: snapshot of lacuna-components CropBox at 6188248 by sync-toolbox-components.py; a change gets a new version.
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

export interface CropBoxProps {
  /** Width of the image in pixels. */
  imageWidth: number
  /** Height of the image in pixels. */
  imageHeight: number
  /** Current crop rectangle: x, y, width, height in image pixels. */
  crop: { x: number; y: number; width: number; height: number }
  /** Called when the user moves or resizes the crop rectangle. */
  onCropChange: (crop: { x: number; y: number; width: number; height: number }) => void
  /** If provided, locks the aspect ratio (width/height) of the crop. */
  aspectRatio?: number
  /** Minimum crop dimension in pixels. */
  minSize?: number
  /** Optional accessible label for the crop region. */
  label?: string
}

type Crop = CropBoxProps['crop']
type Corner = 'nw' | 'ne' | 'sw' | 'se'

const CORNERS: Record<Corner, { col: 0 | 1; row: 0 | 1 }> = {
  nw: { col: 0, row: 0 },
  ne: { col: 1, row: 0 },
  sw: { col: 0, row: 1 },
  se: { col: 1, row: 1 },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max))

function clampedMove(crop: Crop, dx: number, dy: number, imageWidth: number, imageHeight: number): Crop {
  return {
    ...crop,
    x: clamp(crop.x + dx, 0, imageWidth - crop.width),
    y: clamp(crop.y + dy, 0, imageHeight - crop.height),
  }
}

function resizeEdge(crop: Crop, side: 'left' | 'right' | 'top' | 'bottom', delta: number, minSize: number, imageWidth: number, imageHeight: number): Crop {
  if (side === 'left') {
    const x = clamp(crop.x + delta, 0, crop.x + crop.width - minSize)
    return { ...crop, x, width: crop.width + (crop.x - x) }
  }
  if (side === 'right') {
    const width = clamp(crop.width + delta, minSize, imageWidth - crop.x)
    return { ...crop, width }
  }
  if (side === 'top') {
    const y = clamp(crop.y + delta, 0, crop.y + crop.height - minSize)
    return { ...crop, y, height: crop.height + (crop.y - y) }
  }
  const height = clamp(crop.height + delta, minSize, imageHeight - crop.y)
  return { ...crop, height }
}

function applyRatio(crop: Crop, ratio: number, minSize: number, imageWidth: number, imageHeight: number): Crop {
  const height = Math.max(Math.round(crop.width / ratio), minSize)
  const y = clamp(crop.y, 0, imageHeight - height)
  return { ...crop, y, height }
}

function handleKey(
  event: KeyboardEvent<HTMLDivElement>,
  crop: Crop,
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number | undefined,
  minSize: number,
  onCropChange: (crop: Crop) => void,
) {
  const { key, shiftKey } = event
  const step = shiftKey ? 1 : 1
  if (key === 'Escape') return
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
    event.preventDefault()
    if (shiftKey) {
      const side = key === 'ArrowLeft' ? 'left' : key === 'ArrowRight' ? 'right' : key === 'ArrowUp' ? 'top' : 'bottom'
      let next = resizeEdge(crop, side, side === 'left' || side === 'top' ? -step : step, minSize, imageWidth, imageHeight)
      if (aspectRatio) next = applyRatio(next, aspectRatio, minSize, imageWidth, imageHeight)
      if (next.x !== crop.x || next.y !== crop.y || next.width !== crop.width || next.height !== crop.height) onCropChange(next)
      return
    }
    const dx = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0
    const dy = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0
    const next = clampedMove(crop, dx, dy, imageWidth, imageHeight)
    if (next.x !== crop.x || next.y !== crop.y) onCropChange(next)
  }
}

const DRAG_SIDES = ['move', 'left', 'right', 'top', 'bottom', 'nw', 'ne', 'sw', 'se'] as const
type DragMode = (typeof DRAG_SIDES)[number]

export function CropBox({ imageWidth, imageHeight, crop, onCropChange, aspectRatio, minSize = 10, label = 'CropBox' }: CropBoxProps) {
  const [dragging, setDragging] = useState<DragMode | null>(null)
  const cropRef = useRef(crop)
  cropRef.current = crop
  const aspectRef = useRef(aspectRatio)
  aspectRef.current = aspectRatio
  const startRef = useRef({ px: 0, py: 0, crop: cropRef.current })

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return
    const start = startRef.current
    const dx = event.clientX - start.px
    const dy = event.clientY - start.py
    let next: Crop
    if (dragging === 'move') {
      next = clampedMove(start.crop, dx, dy, imageWidth, imageHeight)
    } else if (dragging === 'left') {
      next = resizeEdge(start.crop, 'left', -dx, minSize, imageWidth, imageHeight)
    } else if (dragging === 'right') {
      next = resizeEdge(start.crop, 'right', dx, minSize, imageWidth, imageHeight)
    } else if (dragging === 'top') {
      next = resizeEdge(start.crop, 'top', -dy, minSize, imageWidth, imageHeight)
    } else if (dragging === 'bottom') {
      next = resizeEdge(start.crop, 'bottom', dy, minSize, imageWidth, imageHeight)
    } else {
      const c = CORNERS[dragging]
      const ex = start.crop.x + start.crop.width
      const ey = start.crop.y + start.crop.height
      const x = c.col === 0 ? start.crop.x + dx : clamp(ex - dx, start.crop.x + minSize, imageWidth)
      const y = c.row === 0 ? start.crop.y + dy : clamp(ey - dy, start.crop.y + minSize, imageHeight)
      next = { x, y, width: Math.max(ex - x, x - start.crop.x, minSize), height: Math.max(ey - y, y - start.crop.y, minSize) }
    }
    if (aspectRef.current) next = applyRatio(next, aspectRef.current, minSize, imageWidth, imageHeight)
    const cur = cropRef.current
    if (next.x !== cur.x || next.y !== cur.y || next.width !== cur.width || next.height !== cur.height) onCropChange(next)
  }

  const startDrag = (mode: DragMode) => (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    startRef.current = { px: event.clientX, py: event.clientY, crop: cropRef.current }
    setDragging(mode)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const endDrag = () => setDragging(null)

  const boxStyle: CSSProperties = {
    position: 'absolute',
    left: `${(crop.x / imageWidth) * 100}%`,
    top: `${(crop.y / imageHeight) * 100}%`,
    width: `${(crop.width / imageWidth) * 100}%`,
    height: `${(crop.height / imageHeight) * 100}%`,
    border: 'calc(2px * var(--sf)) solid var(--accent)',
    boxShadow: 'inset 0 0 0 calc(999px * var(--sf)) var(--accent-soft)',
    touchAction: 'none',
    cursor: dragging === 'move' ? 'grabbing' : 'move',
    outlineOffset: 'calc(2px * var(--sf))',
  }

  const handleStyle = (pos: Corner | 'left' | 'right' | 'top' | 'bottom'): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      background: 'var(--paper)',
      border: 'calc(1px * var(--sf)) solid var(--ink)',
      touchAction: 'none',
    }
    const edge = 'calc(12px * var(--sf))'
    switch (pos) {
      case 'nw':
        return { ...base, width: edge, height: edge, left: 0, top: 0, cursor: 'nwse-resize' }
      case 'ne':
        return { ...base, width: edge, height: edge, right: 0, top: 0, cursor: 'nesw-resize' }
      case 'sw':
        return { ...base, width: edge, height: edge, left: 0, bottom: 0, cursor: 'nesw-resize' }
      case 'se':
        return { ...base, width: edge, height: edge, right: 0, bottom: 0, cursor: 'nwse-resize' }
      case 'left':
        return { ...base, width: 'calc(8px * var(--sf))', height: edge, left: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }
      case 'right':
        return { ...base, width: 'calc(8px * var(--sf))', height: edge, right: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' }
      case 'top':
        return { ...base, width: edge, height: 'calc(8px * var(--sf))', left: '50%', top: 0, transform: 'translateX(-50%)', cursor: 'ns-resize' }
      case 'bottom':
        return { ...base, width: edge, height: 'calc(8px * var(--sf))', left: '50%', bottom: 0, transform: 'translateX(-50%)', cursor: 'ns-resize' }
    }
  }

  const handles: { mode: DragMode; style: CSSProperties; aria: string }[] = [
    { mode: 'nw', style: handleStyle('nw'), aria: 'Resize top left' },
    { mode: 'ne', style: handleStyle('ne'), aria: 'Resize top right' },
    { mode: 'sw', style: handleStyle('sw'), aria: 'Resize bottom left' },
    { mode: 'se', style: handleStyle('se'), aria: 'Resize bottom right' },
    { mode: 'left', style: handleStyle('left'), aria: 'Resize left edge' },
    { mode: 'right', style: handleStyle('right'), aria: 'Resize right edge' },
    { mode: 'top', style: handleStyle('top'), aria: 'Resize top edge' },
    { mode: 'bottom', style: handleStyle('bottom'), aria: 'Resize bottom edge' },
  ]

  return (
    <div role="group" aria-label={label} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        role="slider"
        aria-label="Crop rectangle"
        aria-roledescription="crop rectangle"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={imageWidth}
        aria-valuenow={Math.round(crop.x)}
        aria-valuetext={`x ${Math.round(crop.x)}, y ${Math.round(crop.y)}, width ${Math.round(crop.width)}, height ${Math.round(crop.height)}`}
        tabIndex={0}
        style={boxStyle}
        onKeyDown={(event) => handleKey(event, crop, imageWidth, imageHeight, aspectRatio, minSize, onCropChange)}
        onPointerDown={startDrag('move')}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      {handles.map((h) => (
        <div
          key={h.mode}
          aria-label={h.aria}
          aria-hidden="true"
          style={h.style}
          onPointerDown={startDrag(h.mode)}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      ))}
    </div>
  )
}
