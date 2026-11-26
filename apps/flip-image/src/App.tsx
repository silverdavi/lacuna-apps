// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Image Flipper: drop an image, mirror it horizontally or vertically, rotate it
// in 90° steps, and download the result. The image and its transformations are
// kept on this device, so a reload still has them.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { ChangeEvent, DragEvent } from 'react'
import { AppShell, Button, Card, EmptyState, PrimaryButton, Stack } from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'

type Pix = { width: number; height: number; data: Uint8ClampedArray }

interface Session {
  /** Data URL (PNG) of the original image. */
  image: string
  /** File name, e.g. "test.png". */
  name: string
  /** Whether a horizontal mirror has been applied. */
  flippedH: boolean
  /** Whether a vertical mirror has been applied. */
  flippedV: boolean
  /** Clockwise 90° quarter turns applied, modulo 4. */
  rotations: number
}

// Reads a 32-bit big-endian unsigned int from a Uint8Array.
function readBE32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  )
}

// Parses PNG chunk tables and returns IHDR fields plus the concatenated IDAT
// payload.
function parsePngChunks(bytes: Uint8Array): {
  width: number
  height: number
  bitDepth: number
  colorType: number
  idat: Uint8Array
} | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) if (bytes[i] !== sig[i]) return null
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const parts: Uint8Array[] = []
  let total = 0
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const len = readBE32(bytes, offset) >>> 0
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
    const start = offset + 8
    if (start + len > bytes.length) return null
    if (type === 'IHDR') {
      width = readBE32(bytes, start) >>> 0
      height = readBE32(bytes, start + 4) >>> 0
      bitDepth = bytes[start + 8]
      colorType = bytes[start + 9]
    } else if (type === 'IDAT') {
      parts.push(bytes.subarray(start, start + len))
      total += len
    } else if (type === 'IEND') {
      break
    }
    offset = start + len + 4
  }
  if (!width || !height) return null
  const idat = new Uint8Array(total)
  let p = 0
  for (const part of parts) {
    idat.set(part, p)
    p += part.length
  }
  return { width, height, bitDepth, colorType, idat }
}

// Decodes a PNG into RGBA pixel data by parsing the file bytes directly. This
// tolerates IDAT payloads that are not zlib-compressed (raw scanlines), which
// strict browser decoders reject. Falls back to a canvas for formats the
// decoder does not support.
function decodePng(dataUrl: string): Pix | null {
  const bytes = dataUrlToBytes(dataUrl)
  if (!bytes) return null
  const parsed = parsePngChunks(bytes)
  if (!parsed) return null
  const { width, height, bitDepth, colorType, idat } = parsed
  if (!width || !height || bitDepth !== 8) return null
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0
  if (!channels) return null
  const expected = height * (width * channels + 1)
  let scanlines: Uint8Array
  if (idat.length === expected) {
    scanlines = idat
  } else {
    const inflated = zlibInflate(idat)
    if (!inflated || inflated.length < expected) return null
    scanlines = inflated
  }
  const stride = width * channels + 1
  const rowLen = width * channels
  const out = new Uint8ClampedArray(width * height * 4)
  let prevRow: Uint8Array = new Uint8Array(rowLen)
  for (let y = 0; y < height; y++) {
    const filter = scanlines[y * stride]
    const row = y * stride + 1
    const curRow = new Uint8Array(rowLen)
    for (let x = 0; x < rowLen; x++) {
      const value = scanlines[row + x]
      const a = y > 0 ? prevRow[x] : 0
      const left = x >= channels ? curRow[x - channels] : 0
      const c = y > 0 && x >= channels ? prevRow[x - channels] : 0
      const unfiltered =
        filter === 0
          ? value
          : filter === 1
            ? value + left
            : filter === 2
              ? value + a
              : filter === 3
                ? value + Math.floor((a + left) / 2)
                : filter === 4
                  ? value + paeth(a, left, c)
                  : value
      const v = unfiltered & 0xff
      curRow[x] = v
      const col = Math.floor(x / channels)
      const ch = x % channels
       const base = (y * width + col) * 4
       out[base + ch] = v
       if (channels === 1) {
         out[base + 1] = v
         out[base + 2] = v
       }
       if (channels < 4) out[base + 3] = 255
    }
    prevRow = curRow
  }
  return { width, height, data: out }
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

// Minimal zlib inflater supporting stored, fixed, and dynamic Huffman blocks.
function zlibInflate(data: Uint8Array): Uint8Array | null {
  const out = new Uint8Array(data.length * 4 + 16384)
  let outLen = 0
  const state = { data, pos: 2, bitBuf: 0, bitCount: 0 }
  const readBits = (n: number): number => {
    while (state.bitCount < n) {
      state.bitBuf = (state.bitBuf << 8) | data[state.pos++]
      state.bitCount += 8
    }
    const v = state.bitBuf >>> (state.bitCount - n)
    state.bitCount -= n
    return v & ((1 << n) - 1)
  }
  const decode = (table: number[], read: (n: number) => number): number => {
    let code = 0
    for (let len = 1; len <= 15; len++) {
      code = (code << 1) | read(1)
      const base = table[len * 2]
      const cnt = table[len * 2 + 1]
      if (code - base < cnt) return base + (code - base)
    }
    return -1
  }
  for (;;) {
    const last = readBits(1) === 1
    const type = readBits(2)
    if (type === 0) {
      state.bitBuf = 0
      state.bitCount = 0
      if (state.pos + 4 > data.length) return null
      const len = data[state.pos] | (data[state.pos + 1] << 8)
      state.pos += 4
      if (state.pos + len > data.length) return null
      out.set(data.subarray(state.pos, state.pos + len), outLen)
      outLen += len
      state.pos += len
    } else if (type === 1 || type === 2) {
      let litLens: number[]
      let distLens: number[]
      if (type === 1) {
        litLens = fixedLitLengths()
        distLens = fixedDistLengths()
      } else {
        const hlit = readBits(5) + 257
        const hdist = readBits(5) + 1
        const hclen = readBits(4) + 4
        const codeLens: number[] = new Array(19).fill(0)
        for (let i = 0; i < hclen; i++) codeLens[CL_ORDER[i]] = readBits(3)
        const clTable = buildTable(codeLens)
        if (!clTable) return null
        const lens: number[] = []
        while (lens.length < hlit + hdist) {
          const sym = decode(clTable, readBits)
          if (sym < 0) return null
          if (sym < 16) {
            lens.push(sym)
          } else if (sym === 16) {
            if (lens.length === 0) return null
            const rep = lens[lens.length - 1]
            for (let r = 0; r < 1 + readBits(2); r++) lens.push(rep)
          } else if (sym === 17) {
            for (let r = 0; r < 3 + readBits(3); r++) lens.push(0)
          } else {
            for (let r = 0; r < 11 + readBits(7); r++) lens.push(0)
          }
        }
        litLens = lens.slice(0, hlit)
        distLens = lens.slice(hlit, hlit + hdist)
      }
      const litTable = buildTable(litLens)
      const distTable = buildTable(distLens)
      if (!litTable || !distTable) return null
      for (;;) {
        const sym = decode(litTable, readBits)
        if (sym < 0) return null
        if (sym < 256) {
          out[outLen++] = sym
        } else if (sym === 256) {
          break
        } else {
          const dSym = decode(distTable, readBits)
          if (dSym < 0) return null
          const dist = DIST_BASE[dSym] + readBits(DIST_EXTRA[dSym])
          const length = LEN_BASE[sym - 257] + readBits(LEN_EXTRA[sym - 257])
          if (dist > outLen || outLen + length > out.length) return null
          for (let i = 0; i < length; i++) {
            out[outLen] = out[outLen - dist]
            outLen++
          }
        }
      }
    } else {
      return null
    }
    if (last) break
  }
  return out.subarray(0, outLen)
}

const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]

function fixedLitLengths(): number[] {
  const l: number[] = []
  for (let s = 0; s < 288; s++) l.push(s < 144 ? 8 : s < 256 ? 9 : s < 280 ? 7 : 8)
  return l
}

function fixedDistLengths(): number[] {
  return new Array(32).fill(5)
}

// Builds a canonical Huffman decode table: table[len*2] = first code for this
// length, table[len*2+1] = count. A symbol's index in the table equals its
// symbol value, so `code - base` recovers the symbol directly.
function buildTable(lengths: number[]): number[] | null {
  const counts = new Array(16).fill(0)
  for (const len of lengths) {
    if (len > 15) return null
    counts[len]++
  }
  // Reject over-subscribed code sets
  let left = 0
  for (let len = 15; len >= 1; len--) left = (left << 1) - counts[len]
  if (left > 0) return null
  const table = new Array(32).fill(0)
  let code = 0
  let nxt: number[] = new Array(lengths.length).fill(0)
  for (let len = 1; len <= 15; len++) {
    table[len * 2] = code
    table[len * 2 + 1] = counts[len]
    for (let s = 0; s < lengths.length; s++) {
      if (lengths[s] === len) {
        nxt[s] = code++
      }
    }
    code <<= 1
  }
  return table
}

// Decodes an image data URL into raw pixel data. Tries the in-app PNG decoder
// first, then falls back to an <img> element rasterized through a scratch
// canvas for formats the decoder does not support.
function decodeDataUrl(dataUrl: string): Promise<Pix | null> {
  try {
    const decoded = decodePng(dataUrl)
    if (decoded) return Promise.resolve(decoded)
  } catch {
    // fall through to the browser decode path
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const w = img.naturalWidth
        const h = img.naturalHeight
        if (!w || !h) {
          resolve(null)
          return
        }
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const data = ctx.getImageData(0, 0, w, h)
        resolve({ width: data.width, height: data.height, data: data.data })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  if (meta.includes('base64')) {
    const bin = atob(payload)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }
  return null
}

function flipH(p: Pix): Pix {
  const { width, height, data } = p
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + (width - 1 - x)) * 4
      const d = (y * width + x) * 4
      out[d] = data[s]
      out[d + 1] = data[s + 1]
      out[d + 2] = data[s + 2]
      out[d + 3] = data[s + 3]
    }
  }
  return { width, height, data: out }
}

function flipV(p: Pix): Pix {
  const { width, height, data } = p
  const out = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = ((height - 1 - y) * width + x) * 4
      const d = (y * width + x) * 4
      out[d] = data[s]
      out[d + 1] = data[s + 1]
      out[d + 2] = data[s + 2]
      out[d + 3] = data[s + 3]
    }
  }
  return { width, height, data: out }
}

// Clockwise 90° quarter turn: width and height swap.
function rotate90(p: Pix): Pix {
  const { width, height, data } = p
  const outW = height
  const outH = width
  const out = new Uint8ClampedArray(outW * outH * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4
      const d = (x * outW + (outH - 1 - y)) * 4
      out[d] = data[s]
      out[d + 1] = data[s + 1]
      out[d + 2] = data[s + 2]
      out[d + 3] = data[s + 3]
    }
  }
  return { width: outW, height: outH, data: out }
}

function applyTransforms(base: Pix, flippedH: boolean, flippedV: boolean, rotations: number): Pix {
  let result = base
  if (flippedH) result = flipH(result)
  if (flippedV) result = flipV(result)
  const rot = ((rotations % 4) + 4) % 4
  for (let i = 0; i < rot; i++) result = rotate90(result)
  return result
}

function putToCanvas(data: Pix, canvas: HTMLCanvasElement): void {
  canvas.width = data.width
  canvas.height = data.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imgData = ctx.createImageData(data.width, data.height)
  imgData.data.set(data.data)
  ctx.putImageData(imgData, 0, 0)
}

function opLabel(flipH: boolean, flipV: boolean, rot: number): string {
  const parts: string[] = []
  if (flipH) parts.push('Flipped H')
  if (flipV) parts.push('Flipped V')
  if (rot > 0) parts.push(`Rotated ${rot * 90}°`)
  return parts.join(', ')
}

export function App() {
  const { value: session, set: setSession } = useLocalRecord<Session | null>({
    key: 'lacuna.flip-image.session',
    version: 1,
    defaultValue: null,
  })

  const [status, setStatus] = useState<string | null>(null)
  const [baseData, setBaseData] = useState<Pix | null>(null)
  const [restoring, setRestoring] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const loaded = session !== null && !restoring
  const label = session
    ? opLabel(session.flippedH, session.flippedV, session.rotations)
      ? `Loaded: ${session.name} (${opLabel(session.flippedH, session.flippedV, session.rotations)})`
      : `Loaded: ${session.name}`
    : null

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!loaded || !baseData || !session) {
      canvas.width = 100
      canvas.height = 50
      canvas.getContext('2d')?.clearRect(0, 0, 100, 50)
      return
    }
    const result = applyTransforms(baseData, session.flippedH, session.flippedV, session.rotations)
    putToCanvas(result, canvas)
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
    (patch: Partial<Pick<Session, 'flippedH' | 'flippedV' | 'rotations'>>) => {
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
    putToCanvas(result, canvas)
    const stem = session.name.replace(/\.[^.]+$/, '')
    const suffix = session.flippedH || session.flippedV ? '_flipped' : ''
    const url = canvas.toDataURL('image/png')
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${stem}${suffix}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
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
              <PrimaryButton onClick={download} disabled={!loaded}>
                Download
              </PrimaryButton>
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
