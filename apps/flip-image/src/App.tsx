// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Image Flipper: drop an image, mirror it horizontally or vertically, rotate it
// in 90° steps, and download the result. The image and its transformations are
// kept on this device, so a reload still has them.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { ChangeEvent, DragEvent } from 'react'
import { AppShell, Button, Card, EmptyState, Stack } from '@lacuna/ui'
import { flipImageData, ImageData as OpsImageData, rotateImageData } from '@lacuna/image-ops'
import { useLocalRecord } from '@lacuna/use-local-record'



type Pix = { width: number; height: number; data: Uint8ClampedArray }

// Decodes an image by rasterizing it through an <img> element. If the browser
// silently rejects the pixel data (Chromium does this for PNGs whose IDAT is
// not zlib-compressed: onload fires but every pixel comes back transparent),
// the raw PNG bytes are decoded manually as a fallback.
async function decodeDataUrl(dataUrl: string): Promise<Pix | null> {
  const img = new Image()
  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = dataUrl
  })
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h)
    const out = data.data
    let opaque = 0
    for (let i = 3; i < out.length; i += 4) if (out[i] !== 0) opaque++
    if (opaque > 0) return { width: data.width, height: data.height, data: out }
  } catch {
    // fall through to the manual decoder
  }
  return decodePngBytes(dataUrl)
}

// Minimal PNG decoder for the subset of images the app needs to support:
// 8-bit truecolor (RGB) and truecolor-with-alpha (RGBA), all filter types,
// single or multiple IDAT chunks. Handles both raw (uncompressed) and
// zlib/DEFLATE-compressed IDAT payloads.
async function decodePngBytes(dataUrl: string): Promise<Pix | null> {
  const match = /^data:image\/png;base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  let bytes: Uint8Array
  try {
    const b64 = match[1]
    const bin = atob(b64)
    bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  } catch {
    return null
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const sig = [137, 80, 78, 71, 13, 10, 26, 10]
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null
  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatParts: number[] = []
  while (offset + 8 <= bytes.length) {
    const len = view.getUint32(offset)
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
    const dataStart = offset + 8
    const dataEnd = dataStart + len
    if (type === 'IHDR') {
      width = view.getUint32(dataStart)
      height = view.getUint32(dataStart + 4)
      bitDepth = bytes[dataStart + 8]
      colorType = bytes[dataStart + 9]
    } else if (type === 'IDAT') {
      idatParts.push(dataStart, dataEnd)
    } else if (type === 'IEND') {
      break
    }
    offset = dataEnd + 4
  }
  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6) || width === 0 || height === 0) return null
  const channels = colorType === 2 ? 3 : 4
  const expectedLen = (width * channels + 1) * height
  const rawIdat: number[] = []
  for (let p = 0; p < idatParts.length; p += 2) {
    for (let i = idatParts[p]; i < idatParts[p + 1]; i++) rawIdat.push(bytes[i])
  }
  let pixels: Uint8Array
  if (rawIdat.length === expectedLen) {
    // Raw uncompressed IDAT — use directly
    pixels = new Uint8Array(rawIdat)
  } else {
    // zlib/DEFLATE compressed IDAT — inflate via DecompressionStream
    const inflated = await inflate(rawIdat)
    if (!inflated || inflated.length !== expectedLen) return null
    pixels = inflated
  }
  const rowLen = width * channels
  const rgba = new Uint8ClampedArray(width * height * 4)
  const prev = new Uint8Array(rowLen)
  for (let y = 0; y < height; y++) {
    const filter = pixels[y * (rowLen + 1)]
    for (let x = 0; x < rowLen; x++) {
      const off = y * (rowLen + 1) + 1 + x
      const val = pixels[off]
      const a = x >= channels ? pixels[off - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let result: number
      if (filter === 0) result = val
      else if (filter === 1) result = val + a
      else if (filter === 2) result = val + b
      else if (filter === 3) result = val + ((a + b) >> 1)
      else {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        result = val + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
      }
      pixels[off] = result & 0xff
      prev[x] = result & 0xff
    }
    for (let x = 0; x < width; x++) {
      const src = y * (rowLen + 1) + 1 + x * channels
      const dst = (y * width + x) * 4
      rgba[dst] = pixels[src]
      rgba[dst + 1] = pixels[src + 1]
      rgba[dst + 2] = pixels[src + 2]
      rgba[dst + 3] = channels === 4 ? pixels[src + 3] : 255
    }
  }
  return { width, height, data: rgba }
}

// Inflates a zlib/DEFLATE payload using DecompressionStream.
// Returns null when the payload is not valid zlib (e.g. raw uncompressed data).
async function inflate(bytes: number[]): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null
  try {
    const ds = new DecompressionStream('deflate')
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(ds)
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        total += value.length
      }
    }
    if (total === 0) return null
    const out = new Uint8Array(total)
    let o = 0
    for (const chunk of chunks) {
      out.set(chunk, o)
      o += chunk.length
    }
    return out
  } catch {
    return null
  }
}

// Read the raw bytes out of an image-ops result. The image-ops ImageData class
// overrides the global ImageData and reports an unreliable `length` on its data
// array, so the byte count is always computed from width * height * 4 instead.
function readBytes(v: OpsImageData): Uint8ClampedArray {
  const needed = v.width * v.height * 4
  const src = v.data as Uint8ClampedArray | ArrayBuffer
  const arr = src instanceof ArrayBuffer ? new Uint8ClampedArray(src) : new Uint8ClampedArray(src.buffer)
  return arr.slice(0, needed)
}

function fromPix(p: Pix): OpsImageData {
  return new OpsImageData(p.width, p.height, p.data)
}

function applyTransforms(base: Pix, flippedH: boolean, flippedV: boolean, rotations: number): Pix {
  let result: Pix = base
  if (flippedH) {
    const opsResult = flipImageData(fromPix(result), 'horizontal')
    const data = readBytes(opsResult)
    result = { width: opsResult.width, height: opsResult.height, data }
  }
  if (flippedV) {
    const opsResult = flipImageData(fromPix(result), 'vertical')
    const data = readBytes(opsResult)
    result = { width: opsResult.width, height: opsResult.height, data }
  }
  const rot = ((rotations % 4) + 4) % 4
  if (rot > 0) {
    const opsResult = rotateImageData(fromPix(result), rot === 3 ? 270 : (rot * 90 as 90))
    const data = readBytes(opsResult)
    result = { width: opsResult.width, height: opsResult.height, data }
  }
  return result
}

// The image-ops ImageData class overrides the global ImageData, which makes
// canvas putImageData reject the module's results ("not of type 'ImageData'").
// So the transformed pixels are committed via a scratch canvas and drawImage,
// both of which accept plain canvas sources.
function putToCanvas(data: Pix, canvas: HTMLCanvasElement): void {
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const scratch = document.createElement('canvas')
  scratch.width = data.width
  scratch.height = data.height
  const sctx = scratch.getContext('2d')
  if (!sctx) return
  const real = sctx.createImageData(data.width, data.height)
  real.data.set(data.data)
  sctx.putImageData(real, 0, 0)
  ctx.clearRect(0, 0, data.width, data.height)
  ctx.drawImage(scratch, 0, 0)
}

function opLabel(flipH: boolean, flipV: boolean, rot: number): string {
  const parts: string[] = []
  if (flipH) parts.push('Flipped H')
  if (flipV) parts.push('Flipped V')
  if (rot > 0) parts.push(`Rotated ${rot * 90}°`)
  return parts.join(', ')
}

export function App() {
  const { value: session, set: setSession } = useLocalRecord<{
    image: string
    name: string
    flippedH: boolean
    flippedV: boolean
    rotations: number
  } | null>({
    key: 'lacuna.flip-image.session',
    version: 1,
    defaultValue: null,
  })

  const [status, setStatus] = useState<string | null>(null)
  const [baseData, setBaseData] = useState<Pix | null>(null)
  const [restoring, setRestoring] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Restore the persisted image into memory on mount so the canvas can be
  // redrawn after a reload.
  useEffect(() => {
    const s = session
    if (s && s.image) {
      setRestoring(true)
      decodeDataUrl(s.image).then((decoded) => {
        setBaseData(decoded)
        setRestoring(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loaded = session && !restoring
  const label = session
    ? opLabel(session.flippedH, session.flippedV, session.rotations)
      ? `Loaded: ${session.name} (${opLabel(session.flippedH, session.flippedV, session.rotations)})`
      : `Loaded: ${session.name}`
    : null

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!loaded || !baseData) {
      canvas.width = 100
      canvas.height = 50
      canvas.getContext('2d')?.clearRect(0, 0, 100, 50)
      return
    }
    putToCanvas(applyTransforms(baseData, session!.flippedH, session!.flippedV, session!.rotations), canvas)
  }, [session, baseData, loaded])

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onerror = () => setStatus('Could not open that image')
      reader.onload = async () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null
        if (!dataUrl) {
          setStatus('Could not open that image')
          return
        }
        const base = await decodeDataUrl(dataUrl)
        if (!base) {
          setStatus('Could not open that image')
          console.error('flip-image: decode failed', dataUrl.slice(0, 60))
          return
        }
        setBaseData(base)
        setRestoring(false)
        setSession({
          image: dataUrl,
          name: file.name,
          flippedH: false,
          flippedV: false,
          rotations: 0,
        })
      }
      reader.readAsDataURL(file)
    },
    [setSession],
  )

  useEffect(() => {
    if (status === null) return
    const t = window.setTimeout(() => setStatus(null), 4000)
    return () => window.clearTimeout(t)
  }, [status])

  const applyOps = useCallback(
    (patch: Partial<{ flippedH: boolean; flippedV: boolean; rotations: number }>) => {
      if (!session) return
      const next = {
        ...session,
        flippedH: patch.flippedH ?? session.flippedH,
        flippedV: patch.flippedV ?? session.flippedV,
        rotations: patch.rotations !== undefined ? patch.rotations % 4 : session.rotations,
      }
      setSession(next)
    },
    [session, setSession],
  )

  const download = useCallback(() => {
    if (!session || !baseData) return
    const result = applyTransforms(baseData, session.flippedH, session.flippedV, session.rotations)
    const canvas = document.createElement('canvas')
    canvas.width = result.width
    canvas.height = result.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const real = ctx.createImageData(result.width, result.height)
    real.data.set(result.data.subarray(0, result.width * result.height * 4))
    ctx.putImageData(real, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')
    const stem = session.name.replace(/\.[^.]+$/, '')
    const suffix = session.flippedH || session.flippedV ? '_flipped' : ''
    const anchor = document.createElement('a')
    anchor.href = dataUrl
    anchor.download = `${stem}${suffix}.png`
    anchor.click()
  }, [session, baseData])

  const reset = useCallback(() => {
    setBaseData(null)
    setSession(null)
    setStatus(null)
  }, [setSession])

  const onFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (file) {
        try {
          handleFile(file)
        } catch (error) {
          setStatus(`Could not open that image: ${String(error)}`)
        }
      }
    },
    [handleFile],
  )

  const openPicker = useCallback(() => {
    fileRef.current?.click()
  }, [])
  const fileRef = useRef<HTMLInputElement>(null)

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      aria-label="Choose image file"
      style={{ display: 'none' }}
      onChange={onFileChange}
    />
  )

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) {
        try {
          handleFile(file)
        } catch (error) {
          setStatus(`Could not open that image: ${String(error)}`)
        }
      }
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
  }, [])

  const statusText = status ?? (session ? label : 'No image loaded')

  return (
    <AppShell
      name="Image Flipper"
      icon="paint"
      hue="rust"
      category="Productivity"
      meta={session ? session.name : 'empty'}
      status={statusText}
    >
      {fileInput}
      <div onDrop={onDrop} onDragOver={onDragOver} style={{ display: 'contents' }}>
      <Stack lg>
        <Card
          title="Image"
          mono="PREVIEW"
          actions={
            session ? (
              <Button kind="ghost" onClick={reset}>
                Clear
              </Button>
            ) : undefined
          }
        >
          <canvas
            ref={canvasRef}
            width={100}
            height={50}
            style={{
              display: 'block',
              maxWidth: 'calc(320px * var(--sf))',
              maxHeight: 'calc(220px * var(--sf))',
              width: 'auto',
              height: 'auto',
            }}
          />
          {!session ? (
            <EmptyState
              title="Drop an image or click to browse"
              detail="Pick any image to start flipping and rotating it."
              actionLabel="Choose an image"
              onAction={openPicker}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(10px * var(--sf))',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button kind="secondary" onClick={openPicker}>
                  Choose image
                </Button>
              </div>
            </EmptyState>
          ) : null}
          {session ? (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 'calc(13px * var(--tf))',
                opacity: 0.7,
              }}
            >
              PNG
            </span>
          ) : null}
        </Card>

        <Card title="Transform" mono="OPERATIONS">
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
            <Button
              kind="secondary"
              onClick={() => applyOps({ flippedH: !session?.flippedH })}
              disabled={!loaded}
            >
              Flip H
            </Button>
            <Button
              kind="secondary"
              onClick={() => applyOps({ flippedV: !session?.flippedV })}
              disabled={!loaded}
            >
              Flip V
            </Button>
            <Button
              kind="secondary"
              onClick={() => applyOps({ rotations: ((session?.rotations ?? 0) + 1) % 4 })}
              disabled={!loaded}
            >
              Rotate 90°
            </Button>
          </div>
          <div
            style={{
              marginTop: 'calc(12px * var(--sf))',
              display: 'flex',
              gap: 'calc(8px * var(--sf))',
              flexWrap: 'wrap',
            }}
          >
            <Button kind="primary" onClick={download} disabled={!loaded}>
              Download
            </Button>
          </div>
          <div
            style={{
              marginTop: 'calc(10px * var(--sf))',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              opacity: 0.7,
            }}
          >
            {session
              ? `${session.name.replace(/\.[^.]+$/, '')}${
                  session.flippedH || session.flippedV ? '_flipped' : ''
                }.png`
              : 'Download an image to get a copy'}
          </div>
        </Card>

        {status ? (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              color: 'var(--ink)',
            }}
          >
            {status}
          </p>
        ) : null}
      </Stack>
      </div>
    </AppShell>
  )
}
