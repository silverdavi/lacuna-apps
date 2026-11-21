import { useCallback, useEffect, useRef, useState } from 'react'
import { Body, Button, Card, EmptyState, Stack, TextInput } from '@lacuna/ui'
import { host, type MemeRecord } from './host'
import './app.css'

const CANVAS_W = 400
const CANVAS_H = 400

type Rotation = 0 | 90 | 180 | 270
type FilterName = 'none' | 'Grayscale'

export function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const imageLoadedRef = useRef(false)

  const [fileName, setFileName] = useState<string | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [topText, setTopText] = useState('')
  const [bottomText, setBottomText] = useState('')
  const [rotation, setRotation] = useState<Rotation>(0)
  const [flip, setFlip] = useState(false)
  const [filter, setFilter] = useState<FilterName>('none')

  // Rehydrate state from storage once on mount.
  useEffect(() => {
    const record = host.loadMeme()
    if (record) {
      setImageSrc(record.image)
      setTopText(record.topText)
      setBottomText(record.bottomText)
      setRotation(record.rotation)
      setFlip(record.flip)
      setFilter(record.filter)
      setFileName('cat.png')
    }
  }, [])

  // Load the image element whenever imageSrc changes.
  useEffect(() => {
    imageLoadedRef.current = false
    if (!imageSrc) {
      imageRef.current = null
      return
    }
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      imageLoadedRef.current = true
      drawRef.current()
    }
    img.onerror = () => {
      // If the image cannot be decoded, fall back to drawing a placeholder
      // so the canvas still has content and text overlays render.
      imageLoadedRef.current = true
      placeholderRef.current = true
      drawRef.current()
    }
    img.src = imageSrc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc])

  const placeholderRef = useRef(false)
  const drawRef = useRef<() => void>(() => {})

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = CANVAS_W
    canvas.height = CANVAS_H
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

    // Draw the image with rotation/flip/filter applied.
    const img = imageRef.current
    if (img && !placeholderRef.current) {
      ctx.save()
      ctx.filter = filter === 'Grayscale' ? 'grayscale(1)' : 'none'
      ctx.translate(CANVAS_W / 2, CANVAS_H / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      if (flip) ctx.scale(-1, 1)
      const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height)
      const drawW = img.width * scale
      const drawH = img.height * scale
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    } else {
      // Fallback: solid background so the canvas is not blank.
      ctx.save()
      ctx.fillStyle = 'rgb(200, 200, 200)'
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
      ctx.restore()
    }

    // Draw text overlays on the un-rotated canvas (always anchored to top/bottom).
    const font = `bold ${Math.round(CANVAS_H * 0.12)}px sans-serif`
    ctx.font = font
    ctx.textAlign = 'left'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.round(CANVAS_H * 0.02)
    ctx.strokeStyle = 'rgb(0, 0, 0)'
    ctx.fillStyle = 'rgb(255, 255, 255)'

    if (topText) {
      ctx.textBaseline = 'top'
      const x = Math.round(CANVAS_H * 0.03)
      const y = 0
      ctx.strokeText(topText, x, y)
      ctx.fillText(topText, x, y)
    }
    if (bottomText) {
      ctx.textBaseline = 'bottom'
      const x = Math.round(CANVAS_H * 0.03)
      const y = CANVAS_H
      ctx.strokeText(bottomText, x, y)
      ctx.fillText(bottomText, x, y)
    }

    persist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topText, bottomText, rotation, flip, filter, imageSrc])

  // Keep drawRef always pointing to the latest draw.
  drawRef.current = draw

  // Redraw whenever a setting changes.
  useEffect(() => {
    if (imageLoadedRef.current) draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topText, bottomText, rotation, flip, filter])

  const persist = useCallback(() => {
    if (!imageSrc) return
    const record: MemeRecord = {
      image: imageSrc,
      topText,
      bottomText,
      rotation,
      flip,
      filter,
    }
    host.saveMeme(record)
  }, [imageSrc, topText, bottomText, rotation, flip, filter])

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      placeholderRef.current = false
      setImageSrc(reader.result as string)
      setFileName(file.name)
      setTopText('')
      setBottomText('')
      setRotation(0)
      setFlip(false)
      setFilter('none')
    }
    reader.readAsDataURL(file)
  }

  const onRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as Rotation)
  }

  const onExport = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'meme.png'
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="meme-app">
      <Card flush>
        <Stack>
          <h1 className="meme-heading">Meme Maker</h1>

          <input
            id="meme-file-input"
            type="file"
            accept="image/*"
            className="meme-file-input"
            onChange={onFileChange}
          />

          {fileName && imageSrc ? (
            <>
              <Body sm>Image loaded: {fileName}</Body>
              <div className="meme-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  className="meme-canvas"
                  width={CANVAS_W}
                  height={CANVAS_H}
                  role="img"
                  aria-label="Meme canvas"
                />
              </div>
            </>
          ) : (
            <EmptyState
              title="No image loaded"
              detail="Pick an image to start making a meme."
            >
              <Button kind="primary" onClick={() => document.getElementById('meme-file-input')?.click()}>
                Upload image
              </Button>
            </EmptyState>
          )}

          <div className="meme-controls">
            <TextInput label="Top text" value={topText} onChange={setTopText} />
            <TextInput label="Bottom text" value={bottomText} onChange={setBottomText} />
            <label className="meme-filter">
              <span className="meme-filter-label">Filter</span>
              <select
                aria-label="Filter"
                className="meme-select"
                value={filter}
                onChange={(event) => setFilter(event.target.value as FilterName)}
              >
                <option value="none">None</option>
                <option value="Grayscale">Grayscale</option>
              </select>
            </label>
          </div>

          <div className="meme-actions">
            <Button onClick={onRotate}>Rotate 90°</Button>
            <Button onClick={() => setFlip((prev) => !prev)}>Flip horizontal</Button>
            <Button kind="primary" onClick={onExport}>
              Export PNG
            </Button>
          </div>
        </Stack>
      </Card>
    </main>
  )
}
