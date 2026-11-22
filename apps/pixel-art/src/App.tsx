import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Kpi,
  KpiRow,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { type Layer } from './host/mock'
import { DEFAULT_COLOR, hslCss, rgbCss } from './colors'

const GRID = 16

type ColorValue = { hex: string; r: number; g: number; b: number; h: number; s: number; l: number }
type Tool = 'brush' | 'eraser'
type Doc = {
  layers: Layer[]
  selectedLayerId: string
  tool: Tool
}

function makeLayer(name: string, id: string): Layer {
  return { id, name, pixels: new Array(GRID * GRID).fill(null) }
}

function emptyDoc(): Doc {
  return {
    layers: [makeLayer('Layer 1', 'l1')],
    selectedLayerId: 'l1',
    tool: 'brush',
  }
}

function defaultColorValue(): ColorValue {
  return parseHex(DEFAULT_COLOR)
}

function parseHex(input: string): ColorValue {
  let hex = input.trim()
  if (!hex.startsWith('#')) hex = `#${hex}`
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    return { hex: input, r: 0, g: 0, b: 0, h: 0, s: 0, l: 0 }
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let hue = 0
  let sat = 0
  if (max !== min) {
    const d = max - min
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) hue = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) hue = (bn - rn) / d + 2
    else hue = (rn - gn) / d + 4
    hue *= 60
  }
  const norm = (v: number) => Math.min(255, Math.max(0, Math.round(v)))
  const toHex2 = (v: number) => norm(v).toString(16).padStart(2, '0')
  return {
    hex: `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`,
    r,
    g,
    b,
    h: Math.round(hue),
    s: Math.round(sat * 100),
    l: Math.round(l * 100),
  }
}

export function App() {
  const [doc, setDoc] = useState<Doc>(emptyDoc)
  const [color, setColor] = useState<ColorValue>(defaultColorValue)
  const [hexDraft, setHexDraft] = useState<string>(() => defaultColorValue().hex)
  const [status, setStatus] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const layerSeq = useRef(1)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('lacuna.pixel-art.state.v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.data && Array.isArray(parsed.data.layers)) {
          setDoc({
            layers: parsed.data.layers,
            selectedLayerId: parsed.data.selectedLayerId ?? parsed.data.layers[0]?.id,
            tool: parsed.data.tool ?? 'brush',
          })
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist to localStorage on doc change
  useEffect(() => {
    try {
      window.localStorage.setItem(
        'lacuna.pixel-art.state.v1',
        JSON.stringify({ version: 1, data: doc })
      )
    } catch {
      // ignore
    }
  }, [doc])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const selectedLayer = doc.layers.find((l) => l.id === doc.selectedLayerId) ?? doc.layers[0]
    ctx.clearRect(0, 0, GRID, GRID)
    if (selectedLayer) {
      selectedLayer.pixels.forEach((hexVal, i) => {
        if (!hexVal) return
        const px = i % GRID
        const py = Math.floor(i / GRID)
        ctx.fillStyle = hexVal
        ctx.fillRect(px, py, 1, 1)
      })
    }
  }, [doc])

  function paintPixel(x: number, y: number) {
    const idx = y * GRID + x
    const paintHex = color.hex
    const selId = doc.selectedLayerId
    const nextLayers = doc.layers.map((l) => {
      if (l.id !== selId) return l
      const pixels = [...l.pixels]
      pixels[idx] = doc.tool === 'brush' ? paintHex : null
      return { ...l, pixels }
    })
    setDoc({ ...doc, layers: nextLayers })
    setStatus(doc.tool === 'brush' ? `Pixel (${x},${y}) set to ${color.hex}` : `Pixel (${x},${y}) erased`)
  }

  function commit(next: Doc) {
    setDoc(next)
  }

  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * GRID)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * GRID)
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return
    paintPixel(x, y)
  }

  function addLayer() {
    layerSeq.current += 1
    const id = `l${layerSeq.current}`
    const layer = makeLayer(`Layer ${layerSeq.current}`, id)
    const next: Doc = { ...doc, layers: [...doc.layers, layer], selectedLayerId: id }
    commit(next)
  }

  function deleteSelectedLayer() {
    if (doc.layers.length <= 1) return
    const remaining = doc.layers.filter((l) => l.id !== doc.selectedLayerId)
    commit({ ...doc, layers: remaining, selectedLayerId: remaining[0].id })
  }

  function selectTool(t: Tool) {
    commit({ ...doc, tool: t })
  }

  function selectLayer(id: string) {
    commit({ ...doc, selectedLayerId: id })
  }

  function applyHex(value: string) {
    const next = parseHex(value)
    setColor(next)
    setHexDraft(next.hex)
  }

  function exportPng() {
    const off = document.createElement('canvas')
    off.width = GRID
    off.height = GRID
    const octx = off.getContext('2d')
    if (!octx) return
    octx.clearRect(0, 0, GRID, GRID)
    for (let i = doc.layers.length - 1; i >= 0; i--) {
      const layer = doc.layers[i]
      layer.pixels.forEach((hexVal, idx) => {
        if (!hexVal) return
        const px = idx % GRID
        const py = Math.floor(idx / GRID)
        octx.fillStyle = hexVal
        octx.fillRect(px, py, 1, 1)
      })
    }
    off.toBlob((blob) => {
      if (blob) saveBlob(blob, { filename: 'sprite.png' })
      setStatus('Exported sprite.png')
    }, 'image/png')
  }

  function handleSaveJson() {
    const data = JSON.stringify({ layers: doc.layers, selectedLayerId: doc.selectedLayerId, tool: doc.tool, color })
    saveBlob(new Blob([data], { type: 'application/json' }), { filename: 'pixel-art.json' })
    setSaveMsg('Saved pixel-art.json')
  }

  return (
    <AppShell name="Pixel Art Editor" icon="paint" hue="cobalt" category="Productivity" status={status ?? undefined}>
      <Stack style={{ padding: 20 }}>
        <Card title="Tools">
          <Stack style={{ gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button kind={doc.tool === 'brush' ? 'primary' : 'secondary'} onClick={() => selectTool('brush')}>
                Brush
              </Button>
              <Button kind={doc.tool === 'eraser' ? 'primary' : 'secondary'} onClick={() => selectTool('eraser')}>
                Eraser
              </Button>
            </div>
          </Stack>
        </Card>

        <Card title={`Canvas ${GRID}x${GRID}`}>
          <div role="group" aria-label="Pixel canvas" style={{ width: 256, height: 256 }}>
            <canvas
              ref={canvasRef}
              width={GRID}
              height={GRID}
              onClick={onCanvasClick}
              style={{
                display: 'block',
                width: 256,
                height: 256,
                cursor: 'crosshair',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        </Card>

        <Card title="Layers">
          <Stack style={{ gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={addLayer}>Add Layer</Button>
              <Button onClick={deleteSelectedLayer}>Delete Layer</Button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {doc.layers.map((layer) => (
                <div
                  key={layer.id}
                  role="button"
                  tabIndex={0}
                  data-selected={layer.id === doc.selectedLayerId ? 'true' : undefined}
                  onClick={() => selectLayer(layer.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectLayer(layer.id) }}
                  style={{
                    cursor: 'pointer',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: layer.id === doc.selectedLayerId ? '0.125rem solid var(--accent)' : '0.125rem solid var(--ui-line2)',
                  }}
                >
                  {layer.name}
                </div>
              ))}
            </div>
          </Stack>
        </Card>

        <Card title="Color">
          <div role="group" aria-label="Color" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput
              label="Hex"
              value={hexDraft}
              onChange={(value) => {
                setHexDraft(value)
                if (/^#?[0-9a-fA-F]{6}$/.test(value.trim())) applyHex(value)
              }}
              inputMode="text"
            />
            <KpiRow>
              <Kpi value={color.hex} label="Hex" />
              <Kpi value={color.hex} label="Active" accent />
              <Kpi value={rgbCss(color.r, color.g, color.b)} label="RGB" />
              <Kpi value={hslCss(color.h, color.s, color.l)} label="HSL" />
            </KpiRow>
          </div>
        </Card>

        <Card title="Output">
          <Stack style={{ gap: '0.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={exportPng}>Export PNG</Button>
              <Button onClick={handleSaveJson}>Save JSON</Button>
            </div>
            {saveMsg && <div style={{ color: 'var(--ink-80)' }}>{saveMsg}</div>}
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  )
}
