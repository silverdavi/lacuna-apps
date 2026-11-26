// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useRef, useState } from 'react'
import { saveBlob } from '@lacuna/file-save-open'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Rail,
  Select,
  TextInput,
} from '@lacuna/ui'
import { mockStore } from './host/mock'
import { PNG } from './colors'
import './fp.css'

const CANVAS_W = 800
const CANVAS_H = 520

function drawPlan(
  canvas: HTMLCanvasElement,
  state: { layers: string[]; rooms: string[] },
  background: string,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = PNG.paper
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (background === 'Grid') {
    ctx.strokeStyle = PNG.grid
    ctx.lineWidth = 1
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(canvas.width, y + 0.5)
      ctx.stroke()
    }
  }

  ctx.strokeStyle = PNG.accent
  ctx.fillStyle = PNG.ink
  const tf = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tf')) || 1
  ctx.font = `600 ${Math.round(20 * tf)}px Georgia, serif`
  const layerLines = state.layers.filter(Boolean)
  const roomLines = state.rooms.filter(Boolean)
  layerLines.forEach((l, i) => {
    ctx.fillText(`Layer: ${l}`, 24, 40 + i * 28)
  })
  roomLines.forEach((r, i) => {
    ctx.fillText(`Room: ${r}`, 24, 40 + layerLines.length * 28 + i * 28)
  })
}

function planToPng(state: { layers: string[]; rooms: string[] }, background: string): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  drawPlan(canvas, state, background)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG export failed'))
    }, 'image/png')
  })
}

export function App() {
  const initial = mockStore.read()
  const [layers, setLayers] = useState<string[]>(initial.layers)
  const [rooms, setRooms] = useState<string[]>(initial.rooms)
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'Layers' | 'Canvas'>('Layers')
  const [background, setBackground] = useState('Plain')
  const [roomName, setRoomName] = useState('')
  const [roomError, setRoomError] = useState<string | null>(null)
  const [exportState, setExportState] = useState<'idle' | 'saving' | 'error'>('idle')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) drawPlan(canvas, { layers, rooms }, background)
  }, [layers, rooms, background])

  function persist(nextLayers: string[], nextRooms: string[]) {
    mockStore.write({ layers: nextLayers, rooms: nextRooms })
  }

  function addLayer() {
    const next = `Layer ${layers.length + 1}`
    setLayers([...layers, next])
    persist([...layers, next], rooms)
    setSelected(next)
  }

  function deleteLayer(name: string) {
    const next = layers.filter((l) => l !== name)
    setLayers(next)
    if (selected === name) setSelected(null)
    persist(next, rooms)
  }

  function addRoom() {
    const name = roomName.trim()
    if (!name) return setRoomError('Type a room name first')
    if (rooms.includes(name)) return setRoomError('That room already exists')
    const next = [...rooms, name]
    setRooms(next)
    setRoomName('')
    setRoomError(null)
    persist(layers, next)
  }

  function deleteRoom(name: string) {
    const next = rooms.filter((r) => r !== name)
    setRooms(next)
    persist(layers, next)
  }

  function exportPng() {
    setExportState('saving')
    planToPng({ layers, rooms }, background)
      .then((blob) => {
        saveBlob(blob, { filename: 'floor-plan.png', mimeType: 'image/png' })
        setExportState('idle')
      })
      .catch(() => setExportState('error'))
  }

  return (
    <AppShell
      name="Floor Plan Editor"
      icon="design"
      hue="brown"
      category="Productivity"
      status="Saved on this device"
      side={
        <Rail
          title="Floor Plan Editor"
          note="Sketch · export"
          chips={['Layers', 'Rooms', 'PNG export']}
        >
          <FormGrid>
            <Select
              label="Background"
              value={background}
              onChange={setBackground}
              options={['Plain', 'Grid']}
            />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={exportPng} disabled={exportState === 'saving'}>
              Export PNG
            </Button>
          </Actions>
          {exportState === 'error' && <p role="alert">PNG export failed</p>}
        </Rail>
      }
    >
      <div role="tablist" aria-label="Editor views" className="fp-tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Layers'}
          className={`fp-tab${tab === 'Layers' ? ' active' : ''}`}
          onClick={() => setTab('Layers')}
        >
          Layers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Canvas'}
          className={`fp-tab${tab === 'Canvas' ? ' active' : ''}`}
          onClick={() => setTab('Canvas')}
        >
          Canvas
        </button>
      </div>

      {tab === 'Layers' ? (
        <div role="tabpanel" aria-label="Layers">
          <Card mono={`${layers.length} layers`} title="Layers">
            <FormGrid>
              <Actions>
                <Button kind="primary" onClick={addLayer}>
                  Add layer
                </Button>
                <Button
                  kind="danger"
                  onClick={() => selected && deleteLayer(selected)}
                  disabled={selected === null}
                >
                  Delete layer
                </Button>
              </Actions>
            </FormGrid>
            <ul className="fp-list lk-list" aria-label="Layers">
              {layers.map((l) => (
                <li key={l} className={`lk-row${selected === l ? ' hot' : ''}`} aria-label={l}>
                  <button type="button" className="lk-row-text" onClick={() => setSelected(l)}>
                    <span className="lk-row-title">{l}</span>
                  </button>
                  <Button kind="ghost" onClick={() => { setSelected(l); deleteLayer(l) }}>
                    Remove {l}
                  </Button>
                </li>
              ))}
            </ul>
            {layers.length === 0 && (
              <EmptyState title="No layers" detail="Add the first layer to start." actionLabel="New layer" onAction={addLayer} />
            )}
          </Card>
        </div>
      ) : (
        <div role="tabpanel" aria-label="Canvas">
          <Card mono="Drawing surface" title="Canvas">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              role="img"
              aria-label="Floor plan drawing surface"
              data-background={background}
              style={{
                width: '100%',
                maxWidth: CANVAS_W,
                height: 'auto',
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                display: 'block',
                border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                borderRadius: 10,
                background:
                  background === 'Grid'
                    ? 'repeating-linear-gradient(0deg, transparent, transparent calc(39px * var(--sf)), var(--ui-line) calc(39px * var(--sf)), var(--ui-line) calc(40px * var(--sf))), repeating-linear-gradient(90deg, transparent, transparent calc(39px * var(--sf)), var(--ui-line) calc(39px * var(--sf)), var(--ui-line) calc(40px * var(--sf)))'
                    : 'var(--paper)',
              }}
            />
          </Card>
        </div>
      )}

      <Card mono="New" title="Rooms">
        <FormGrid>
          <TextInput
            label="Room name"
            value={roomName}
            onChange={setRoomName}
            placeholder="e.g. Living Room"
            error={roomError}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={addRoom}>
            Add room
          </Button>
        </Actions>
      </Card>

      <Card mono={`${rooms.length} rooms`} title="Room list">
        {rooms.length === 0 ? (
          <EmptyState title="No rooms" detail="Name a room and add it." actionLabel="New room" onAction={addRoom} />
        ) : (
          <div className="lk-list">
            {rooms.map((r) => (
              <div key={r} role="listitem" className="lk-row" aria-label={r}>
                <span className="lk-row-text">
                  <span className="lk-row-title">{r}</span>
                </span>
                <Button kind="ghost" onClick={() => deleteRoom(r)}>
                  Delete {r}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  )
}
