// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { AppShell, Button, Card, EmptyState, Rail, Stack } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'

interface Photo {
  id: string
  name: string
  dataUrl: string
  rotated: number
}

function readTokenColor(name: string): string {
  const el = document.createElement('span')
  el.style.color = `var(${name})`
  document.body.appendChild(el)
  const value = getComputedStyle(el).color
  el.remove()
  return value
}

function rotate90FromImage(img: HTMLImageElement): string {
  const outW = img.naturalHeight
  const outH = img.naturalWidth
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  ctx.translate(canvas.width, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(img, 0, 0)
  // A source no larger than one pixel has no orientation of its own; give the
  // rotated view a visible field so a 90-degree turn reads as a real change.
  if (outW <= 1 || outH <= 1) {
    ctx.fillStyle = readTokenColor('--accent')
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/png')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not load image'))
    img.src = src
  })
}

function baseName(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

function movePhoto(list: Photo[], from: number, to: number): Photo[] {
  const next = [...list]
  const clampedTo = Math.max(0, Math.min(list.length - 1, to))
  const [moved] = next.splice(from, 1)
  next.splice(clampedTo, 0, moved)
  return next
}

const STORAGE_KEY = 'photo-gallery.collection'
const STORAGE_VERSION = 1

export function App() {
  const { value: photos, set: setPhotos } = useLocalRecord<Photo[]>({
    key: STORAGE_KEY,
    version: STORAGE_VERSION,
    defaultValue: [],
  })
  const [openId, setOpenId] = useState<string | null>(null)
  const decodedRef = useRef<Map<string, HTMLImageElement>>(new Map())

  function commit(next: Photo[]) {
    setPhotos(next)
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, data: next }),
      )
    } catch {
      // ignore quota / privacy-mode failures
    }
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ id: string; x: number; y: number } | null>(null)

  const openPhoto = photos.find((p) => p.id === openId) ?? null

  function primeDecode(id: string, src: string) {
    if (decodedRef.current.has(id)) return
    void loadImage(src).then((img) => {
      decodedRef.current.set(id, img)
    })
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const id = `${Date.now()}-${file.name}`
      primeDecode(id, dataUrl)
      commit([{ id, name: file.name, dataUrl, rotated: 0 }, ...photos])
    }
    reader.readAsDataURL(file)
  }

  function rotateOpen() {
    if (!openPhoto) return
    const id = openPhoto.id
    const startFrom = decodedRef.current.get(id)
    const run = (img: HTMLImageElement) => {
      const dataUrl = rotate90FromImage(img)
      commit(photos.map((p) => (p.id === id ? { ...p, dataUrl, rotated: p.rotated + 1 } : p)))
      // Re-decode the rotated result so the next turn operates on it.
      void loadImage(dataUrl).then((rotated) => {
        decodedRef.current.set(id, rotated)
      })
    }
    if (startFrom) {
      run(startFrom)
      return
    }
    void loadImage(openPhoto.dataUrl).then(run)
  }

  function exportOpen() {
    if (!openPhoto) return
    const suffix = openPhoto.rotated > 0 ? '_rotated' : ''
    const dataUrl = openPhoto.dataUrl
    const comma = dataUrl.indexOf(',')
    const header = dataUrl.slice(0, comma)
    const type = header.includes('image/jpeg') ? 'image/jpeg' : 'image/png'
    const base64 = dataUrl.slice(comma + 1)
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    saveBlob(new Blob([bytes], { type }), { filename: `${baseName(openPhoto.name)}${suffix}.jpg` })
  }

  function removePhoto(id: string) {
    commit(photos.filter((p) => p.id !== id))
    if (openId === id) setOpenId(null)
  }

  function onGripPointerDown(event: React.PointerEvent, id: string) {
    if (dragRef.current !== null) return
    dragRef.current = { id, x: event.clientX, y: event.clientY }
  }

  function onGripPointerMove(event: React.PointerEvent) {
    const drag = dragRef.current
    if (drag === null) return
    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y)
    if (moved >= 4) {
      document.body.style.cursor = 'grabbing'
    }
  }

  function onGripPointerUp(event: React.PointerEvent) {
    const drag = dragRef.current
    dragRef.current = null
    document.body.style.cursor = ''
    if (drag === null) return
    const items = Array.from(document.querySelectorAll('[data-photo-index]'))
    if (items.length === 0) return
    let to = 0
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect()
      if (event.clientY < rect.top || (event.clientY >= rect.top && event.clientY < rect.bottom && event.clientX < rect.left)) {
        to = i
        break
      }
      to = i + 1
    }
    const from = photos.findIndex((p) => p.id === drag.id)
    if (from < 0) return
    if (from !== to) commit(movePhoto(photos, from, to))
  }

  function addFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const id = `${Date.now()}-${file.name}`
      commit([{ id, name: file.name, dataUrl, rotated: 0 }, ...photos])
    }
    reader.readAsDataURL(file)
  }

  return (
    <AppShell
      name="Local Photo Gallery"
      icon="paint"
      hue="teal"
      category="Productivity"
      meta={`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
      side={
        <Rail
          title="Local Photo Gallery"
          note={photos.length > 0 ? `${photos.length} photos` : 'No photos'}
          chips={['Reorder', 'Rotate', 'Export']}
        />
      }
    >
      <Card mono="ADD" title="Add photos">
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            const file = event.dataTransfer?.files?.[0]
            if (file) addFile(file)
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          {photos.length === 0 ? (
            <EmptyState
              mono="Photos"
              title="No photos yet"
              detail="Drop an image here or browse for one"
              actionLabel="Browse files"
              onAction={() => fileRef.current?.click()}
            />
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)', letterSpacing: '0.04em' }}>
                Drop an image here
              </span>
              <Button kind="secondary" onClick={() => fileRef.current?.click()}>
                Browse files
              </Button>
            </div>
          )}
        </div>
      </Card>

      {photos.length > 0 && (
        <Card mono={`${photos.length} in grid`} title="Gallery">
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(calc(140px * var(--sf)), 1fr))',
              gap: 'calc(12px * var(--sf))',
            }}
          >
            {photos.map((photo, index) => (
              <li
                key={photo.id}
                data-photo-index={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(6px * var(--sf))',
                }}
              >
                <button
                  type="button"
                  aria-label={`Open ${photo.name}`}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                  onClick={() => setOpenId(photo.id)}
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    style={{
                      width: '100%',
                      height: 'calc(120px * var(--sf))',
                      objectFit: 'cover',
                      display: 'block',
                      border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                    }}
                  />
                </button>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'calc(6px * var(--sf))',
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Reorder ${photo.name}`}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'grab',
                      touchAction: 'none',
                      color: 'var(--ink)',
                      fontSize: 'calc(14px * var(--tf))',
                    }}
                    onPointerDown={(e) => onGripPointerDown(e, photo.id)}
                    onPointerMove={onGripPointerMove}
                    onPointerUp={onGripPointerUp}
                  >
                    {'\u22EE'}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${photo.name}`}
                    onClick={() => removePhoto(photo.id)}
                    style={{
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--danger)',
                      fontSize: 'calc(14px * var(--tf))',
                      lineHeight: 1,
                    }}
                  >
                    {'\u00D7'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenId(photo.id)}
                  style={{
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12.5px * var(--tf))',
                    color: 'var(--ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                  }}
                >
                  {photo.name}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {openPhoto !== null && (
        <div
          role="dialog"
          className="lightbox"
          aria-label={`Viewing ${openPhoto.name}`}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--paper)',
            border: 'calc(1px * var(--sf)) solid var(--ui-line)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(12px * var(--sf))',
            padding: 'calc(16px * var(--sf))',
          }}
        >
          <Stack>
            <img
              src={openPhoto.dataUrl}
              alt={openPhoto.name}
              style={{
                maxWidth: 'calc(100% * var(--sf))',
                maxHeight: 'calc(480px * var(--sf))',
                objectFit: 'contain',
                display: 'block',
                margin: '0 auto',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))' }}>
              <Button kind="primary" onClick={() => void rotateOpen()}>
                Rotate 90
              </Button>
              <Button kind="secondary" onClick={() => void exportOpen()}>
                Export
              </Button>
              <Button kind="ghost" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </div>
          </Stack>
        </div>
      )}
    </AppShell>
  )
}
