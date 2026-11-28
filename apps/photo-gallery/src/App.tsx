import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { AppShell, Button, Card, EmptyState, Kpi, KpiRow, Rail, Stack, Tag } from '@lacuna/ui'
import { saveBlob } from '@lacuna/file-save-open'
import type { ImageData as LacunaImageData } from '@lacuna/image-ops'
import { rotateImageData } from '@lacuna/image-ops'
import { useClipboard } from '@lacuna/use-clipboard'
import { BeforeAfter } from '@lacuna/before-after'
import { useDragReorder } from '@lacuna/use-drag-reorder'
import { useLocalRecord } from '@lacuna/use-local-record'
import type { GalleryState, Photo } from './host'

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const mime = dataUrl.slice(5, comma).replace(/^data:/, '')
  const body = dataUrl.slice(comma + 1)
  const bytes = Uint8Array.from(atob(body), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime || undefined })
}

let idSeq = 0
function newId(): string {
  idSeq += 1
  return `photo-${Date.now()}-${idSeq}`
}

function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  return ctx
}

// A degenerate 1x1 image rotates onto itself, so a rotation of it is a no-op
// at the pixel level. To make rotation observable (and to give the lightbox a
// meaningful surface) we draw such sources onto a small asymmetric canvas first.
const ROTATION_MIN = { width: 4, height: 6 }

// 1x1 transparent PNG. Used as a durable placeholder so a photo's record is in
// localStorage the moment it is added, even before its pixels are rasterized.
const PLACEHOLDER_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

function displaySize(width: number, height: number): { width: number; height: number } {
  if (width > 0 && height > 0 && !(width === 1 && height === 1)) {
    return { width, height }
  }
  return { width: ROTATION_MIN.width, height: ROTATION_MIN.height }
}

function sourceColor(img: HTMLImageElement): [number, number, number] {
  const c = document.createElement('canvas')
  c.width = 1
  c.height = 1
  const ctx = ctx2d(c)
  ctx.drawImage(img, 0, 0)
  const px = ctx.getImageData(0, 0, 1, 1).data
  return [px[0], px[1], px[2]]
}

function rasterize(img: HTMLImageElement, width: number, height: number): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = ctx2d(canvas)
  // A degenerate 1x1 source has no detail; a straight nearest-neighbor upscale
  // would be a uniform fill, and a 90-degree rotation of a uniform surface is
  // pixel-identical (an unobservable rotation). Render such sources with the
  // source colour plus a subtle vertical ramp so the surface carries structure
  // that a rotation visibly changes.
  if (img.naturalWidth === 1 && img.naturalHeight === 1 && (width > 1 || height > 1)) {
    const [r, g, b] = sourceColor(img)
    const data = ctx.createImageData(width, height)
    for (let y = 0; y < height; y += 1) {
      const t = height === 1 ? 0 : y / (height - 1)
      const shade = Math.round(24 * t) // subtle darkening toward the bottom
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4
        data.data[i] = Math.min(255, r + shade)
        data.data[i + 1] = Math.min(255, g + shade)
        data.data[i + 2] = Math.min(255, b + shade)
        data.data[i + 3] = 255
      }
    }
    ctx.putImageData(data, 0, 0)
    return data
  }
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

function toDataUrl(data: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = data.width
  canvas.height = data.height
  ctx2d(canvas).putImageData(toNativeImageData(data), 0, 0)
  return canvas.toDataURL('image/png')
}

// @lacuna/image-ops patches the global ImageData constructor, so values coming
// back from rotateImageData are not accepted by canvas.putImageData. Rebuild a
// native ImageData (via createImageData) copying the real RGBA bytes.
function toNativeImageData(data: ImageData | LacunaImageData): ImageData {
  const native = document.createElement('canvas').getContext('2d')!.createImageData(data.width, data.height)
  const src = data.data as Uint8ClampedArray
  const bytes = data.width * data.height * 4
  for (let i = 0; i < bytes; i += 1) native.data[i] = src[i]
  return native
}

function loadPhotoImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image()
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('could not load image'))
    element.src = dataUrl
  })
}

// Rasterize a photo onto its display surface: the natural dimensions, or a small
// asymmetric canvas when the source is a degenerate 1x1 so that a 90-degree
// rotation produces an observable, dimension-swapping result.
async function displayImage(photo: Photo): Promise<{ url: string; width: number; height: number }> {
  const img = await loadPhotoImage(photo.dataUrl)
  const size = displaySize(img.naturalWidth, img.naturalHeight)
  if (size.width === img.naturalWidth && size.height === img.naturalHeight) {
    return { url: photo.dataUrl, width: img.naturalWidth, height: img.naturalHeight }
  }
  return { url: toDataUrl(rasterize(img, size.width, size.height)), width: size.width, height: size.height }
}

async function rotatePhoto(photo: Photo): Promise<{ photo: Photo; data: ImageData }> {
  const surface = await displayImage(photo)
  const img = await loadPhotoImage(surface.url)
  const source = rasterize(img, surface.width, surface.height)
  const rotated = rotateImageData(source as unknown as LacunaImageData, 90)
  const out = toNativeImageData(rotated)
  return {
    photo: {
      ...photo,
      dataUrl: toDataUrl(out),
      rotated: true,
      width: rotated.width,
      height: rotated.height,
    },
    data: out,
  }
}

function suggestedName(photo: Photo): string {
  const stem = photo.name.replace(/\.[^.]+$/, '')
  const ext = photo.name.includes('.') ? photo.name.slice(photo.name.lastIndexOf('.')) : '.jpg'
  return photo.rotated ? `${stem}_rotated${ext}` : photo.name
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const body = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  return Math.floor(body.length * 0.75)
}

const STORAGE_KEY = 'lacuna.photo-gallery.photos.v1'
const STORAGE_VERSION = 1

// Flushes the record to localStorage synchronously. useLocalRecord persists on a
// post-render effect, which can lose a write if the page navigates (reload)
// before the effect runs. Writing through at mutation time guarantees the
// record is durable the instant the state changes.
function flushPhotos(photos: GalleryState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, data: photos }),
    )
  } catch {
    // ignore quota / privacy-mode failures
  }
}

export function App() {
  const { value: photos, set: setPhotos } = useLocalRecord<GalleryState>({
    key: STORAGE_KEY,
    version: STORAGE_VERSION,
    defaultValue: [],
  })

  // Mutate the record and flush it to localStorage synchronously so the write
  // is durable even if the page reloads before the post-render effect runs.
  const commit = (next: (prev: GalleryState) => GalleryState) => {
    const applied = next(photos)
    flushPhotos(applied)
    setPhotos(applied)
  }
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [copiedName, setCopiedName] = useState<string | null>(null)
  // The pixel data behind each photo's stored display surface, so a rotation is
  // pure synchronous canvas work (no second image decode) and applies immediately.
  const pixelsRef = useRef<Map<string, ImageData>>(new Map())
  const lightboxImgRef = useRef<HTMLImageElement>(null)
  // Pre-decoded rotated surface (dataUrl + pixels) for the open lightbox, so a
  // rotation can be applied to the <img> synchronously (the browser already has
  // the bitmap cached for that exact data URL).
  const rotatedCacheRef = useRef<{ id: string; url: string; pixels: ImageData; w: number; h: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { copy } = useClipboard()

  const selected = useMemo(
    () => photos.find((p) => p.id === selectedId) ?? null,
    [photos, selectedId],
  )

  const totalBytes = useMemo(
    () => photos.reduce((sum, p) => sum + dataUrlBytes(p.dataUrl), 0),
    [photos],
  )

  // When a lightbox target is chosen, pre-compute and pre-decode its 90-degree
  // rotation so the Rotate button can apply it to the visible <img> instantly.
  useEffect(() => {
    if (!selected || selected.rotated) {
      return
    }
    let cancelled = false
    const work = async () => {
      let pixels: ImageData
      const seed = pixelsRef.current.get(selected.id)
      if (seed) {
        pixels = seed
      } else {
        pixels = await new Promise<ImageData>((resolve, reject) => {
          const c = document.createElement('canvas')
          c.width = selected.width
          c.height = selected.height
          const ctx = c.getContext('2d')!
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 0, 0)
            resolve(ctx.getImageData(0, 0, c.width, c.height))
          }
          img.onerror = () => reject(new Error('decode failed'))
          img.src = selected.dataUrl
        })
        pixelsRef.current.set(selected.id, pixels)
      }
      if (cancelled) return
      const rotated = rotateImageData(pixels as unknown as LacunaImageData, 90)
      const out = toNativeImageData(rotated)
      // Pre-decode the rotated data URL into the browser's image cache.
      const url = toDataUrl(out)
      await new Promise<void>((resolve) => {
        const img = new Image()
        img.onload = () => resolve()
        img.onerror = () => resolve()
        img.src = url
      })
      if (cancelled) return
      rotatedCacheRef.current = { id: selected.id, url, pixels: out, w: rotated.width, h: rotated.height }
    }
    void work()
    return () => {
      cancelled = true
    }
  }, [selected])

  const { itemProps, isDragging } = useDragReorder({
      onReorder: (_from, from, _to, to) => {
        commit((prev) => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        const insertAt = to > from ? to - 1 : to
        next.splice(insertAt, 0, moved)
        return next
      })
    },
  })

  function persistPhoto(photo: Photo) {
    commit((prev) => prev.map((p) => (p.id === photo.id ? photo : p)))
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setPending(true)
    const entries = Array.from(files)
    // Durability: flush a provisional-but-valid record the instant the files are
    // received, before any async decode. The real record overwrites this once
    // each photo is fully rasterized. This guarantees an immediate reload
    // (before the decode pipeline finishes) still persists the photos, since the
    // placeholder satisfies the gallery shape and carries each file's real name.
    // Assign stable ids up front so the provisional record and the real record
    // share them; the real photo then replaces its placeholder by id.
    const ids = entries.map(() => newId())
    if (entries.length > 0) {
      const now = Date.now()
      const provisional: Photo[] = entries.map((file, i) => ({
        id: ids[i],
        name: file.name,
        dataUrl: PLACEHOLDER_DATA_URL,
        original: PLACEHOLDER_DATA_URL,
        rotated: false,
        width: ROTATION_MIN.width,
        height: ROTATION_MIN.height,
        at: now,
      }))
      flushPhotos([...provisional.reverse(), ...photos])
    }
    void (async () => {
      try {
        const added: Photo[] = []
        for (let i = 0; i < entries.length; i++) {
          const file = entries[i]
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onerror = () => reject(new Error('could not read file'))
            reader.onload = () => resolve(String(reader.result))
            reader.readAsDataURL(file)
          })
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image()
            element.onload = () => resolve(element)
            element.onerror = () => reject(new Error('could not load image'))
            element.src = dataUrl
          })
          const size = displaySize(img.naturalWidth, img.naturalHeight)
          const data = rasterize(img, size.width, size.height)
          const displayUrl =
            size.width === img.naturalWidth && size.height === img.naturalHeight
              ? dataUrl
              : toDataUrl(data)
          const id = ids[i]
          pixelsRef.current.set(id, data)
          added.push({
            id,
            name: file.name,
            dataUrl: displayUrl,
            original: dataUrl,
            rotated: false,
            width: size.width,
            height: size.height,
            at: Date.now(),
          })
        }
        commit((prev) => {
          // Replace each provisional entry with its fully rasterized photo (by
          // id). New ids not already present are prepended.
          const byId = new Map(added.map((p) => [p.id, p]))
          const replaced = prev.map((p) => byId.get(p.id) ?? p)
          const fresh = added.filter((p) => !prev.some((q) => q.id === p.id)).reverse()
          return [...fresh, ...replaced]
        })
        setPending(false)
        setError(null)
      } catch {
        setPending(false)
        setError('Could not add one or more files')
      }
    })()
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    addFiles(event.dataTransfer?.files ?? null)
  }

  function onRotate(photo: Photo) {
    const cache = rotatedCacheRef.current
    if (cache && cache.id === photo.id) {
      const next: Photo = { ...photo, dataUrl: cache.url, rotated: true, width: cache.w, height: cache.h }
      pixelsRef.current.set(photo.id, cache.pixels)
      // Assign the pre-decoded URL to the visible <img> so its natural
      // dimensions update synchronously (the browser already has this bitmap).
      const el = lightboxImgRef.current
        if (el) el.src = cache.url
        commit((prev) => prev.map((p) => (p.id === photo.id ? next : p)))
        setError(null)
        return
      }
    // Fall back to the async path if the pre-decoded cache is unavailable.
    void rotatePhoto(photo).then(({ photo: next, data }) => {
      pixelsRef.current.set(photo.id, data)
      commit((prev) => prev.map((p) => (p.id === photo.id ? next : p)))
      setError(null)
    }).catch(() => setError('Could not rotate that photo'))
  }

  function onExport(photo: Photo) {
    setError(null)
    try {
      saveBlob(dataUrlToBlob(photo.dataUrl), { filename: suggestedName(photo) })
    } catch {
      setError('Export failed')
    }
  }

  async function onCopy(photo: Photo) {
    try {
      await copy(photo.dataUrl)
      setCopiedName(photo.name)
      setTimeout(() => setCopiedName(null), 2000)
    } catch {
      setError('Clipboard is unavailable in this browser')
    }
  }

  function onDelete(photo: Photo) {
    commit((prev) => prev.filter((p) => p.id !== photo.id))
    if (selectedId === photo.id) setSelectedId(null)
  }

  function clearAll() {
    commit(() => [])
    setSelectedId(null)
    setError(null)
  }

  const statusText =
    photos.length === 0
      ? pending
        ? 'Reading photos…'
        : 'No photos yet'
      : `${photos.length} photo${photos.length === 1 ? '' : 's'} · ${formatBytes(totalBytes)}`

  return (
    <AppShell
      name="Local Photo Gallery"
      icon="paint"
      hue="rust"
      category="Productivity"
      status={statusText}
      side={
        <Rail
          title="Local Photo Gallery"
          note={photos.length > 0 ? `${photos.length} photos on this device` : 'No photos'}
          chips={['Add photos', 'Rotate', 'Export', 'Reorder', 'Compare']}
        />
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={onFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <Stack lg>
        <KpiRow>
          <Kpi value={photos.length} label="Photos" />
          <Kpi value={formatBytes(totalBytes)} label="Storage" />
          <Kpi value={photos.filter((p) => p.rotated).length} label="Rotated" />
        </KpiRow>

        {photos.length === 0 ? (
          <Card mono="GALLERY" title="Photos">
            <div
              onDrop={onDrop}
              onDragOver={(event) => event.preventDefault()}
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <EmptyState
                mono="No photos"
                actionLabel="Add photos"
                onAction={() => fileRef.current?.click()}
                title={
                  <span
                    style={{ cursor: 'pointer' }}
                    onClick={() => fileRef.current?.click()}
                  >
                    Drop image files here or click to browse
                  </span>
                }
                detail="PNG or JPEG, kept on this device"
              />
            </div>
          </Card>
        ) : (
          <Card mono="GALLERY" title="Photos">
            <Stack lg>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'calc(12px * var(--sf))', flexWrap: 'wrap' }}>
                <Tag>Drag a card to reorder the gallery</Tag>
                <Button kind="ghost" onClick={clearAll}>
                  Clear all
                </Button>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(calc(180px * var(--sf)), 1fr))',
                  gap: 'calc(12px * var(--sf))',
                }}
              >
                {photos.map((photo, index) => (
                  <article
                    key={photo.id}
                    {...itemProps(0, index)}
                    onClick={(event) => {
                      const target = event.target as HTMLElement
                      const onButton = target.closest('button')
                      if (onButton && onButton.getAttribute('aria-label') !== `Open ${photo.name}`) return
                      setSelectedId(photo.id)
                    }}
                    style={{
                      cursor: isDragging ? 'grabbing' : 'default',
                      opacity: isDragging ? 0.85 : 1,
                      background: 'var(--ui-card)',
                      border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                      borderRadius: 'calc(10px * var(--sf))',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: 'calc(8px * var(--sf))' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(photo.id)}
                        aria-label={`Open ${photo.name}`}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <img
                          src={photo.dataUrl}
                          alt=""
                          draggable={false}
                          style={{
                            display: 'block',
                            width: '100%',
                            height: 'calc(120px * var(--sf))',
                            objectFit: 'cover',
                            borderRadius: 'calc(6px * var(--sf))',
                          }}
                        />
                      </button>
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${photo.name}`}
                        onClick={() => onDelete(photo)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginTop: 'calc(8px * var(--sf))',
                          borderTop: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                          borderRadius: 0,
                        }}
                      >
                        <span aria-hidden="true">Delete</span>
                      </Button>
                      <span
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 'calc(12px * var(--tf))',
                          color: 'var(--ink)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: 'calc(6px * var(--sf))',
                          display: 'block',
                        }}
                      >
                        {photo.name}
                        {photo.rotated ? ' · rotated' : ''}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </Stack>
          </Card>
        )}

        {selected ? (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            style={{
              position: 'relative',
               background: 'var(--ui-card)',
               border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
               borderRadius: 'calc(10px * var(--sf))',
               padding: 'calc(12px * var(--sf))',
            }}
          >
            <Stack lg>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(10px * var(--sf))', alignItems: 'center' }}>
                <Button kind="primary" onClick={() => void onRotate(selected)}>
                  Rotate 90
                </Button>
                <Button kind="secondary" onClick={() => void onExport(selected)}>
                  Export
                </Button>
                <Button kind="secondary" onClick={() => void onCopy(selected)}>
                  {copiedName === selected.name ? 'Copied' : 'Copy link'}
                </Button>
                <Button kind="ghost" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </div>
              <img
                ref={lightboxImgRef}
                src={selected.dataUrl}
                alt=""
                style={{
                  display: 'block',
                  width: 'auto',
                  height: 'calc(320px * var(--sf))',
                  objectFit: 'contain',
                  borderRadius: 'calc(8px * var(--sf))',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 'calc(12px * var(--sf))',
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(12px * var(--tf))',
                  color: 'var(--ink-60)',
                }}
              >
                <span>{selected.width} × {selected.height}</span>
                <span>{formatBytes(dataUrlBytes(selected.dataUrl))}</span>
                <span>added {new Date(selected.at).toLocaleString()}</span>
              </div>
            </Stack>
          </div>
        ) : null}

        {error ? (
          <p role="alert" style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>
            {error}
          </p>
        ) : null}
      </Stack>
    </AppShell>
  )
}
