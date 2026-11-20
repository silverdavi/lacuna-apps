import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, DragEvent, ReactNode } from 'react'
import { Body, Card, MonoLabel, Stack } from '@lacuna/ui'
import { loadImage, saveImage } from './host'
import type { ImageRecord } from './host/mock'
import './app.css'

const MAX_SCALE = 6

function Btn({ kind = 'secondary', children, ...rest }: { kind?: 'primary' | 'secondary' } & ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button type="button" className={`lc-btn ${kind}`} {...rest}>
      {children}
    </button>
  )
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer | null {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const meta = dataUrl.slice(0, comma)
  const b64 = dataUrl.slice(comma + 1)
  if (meta.includes(';base64')) {
    try {
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return bytes.buffer
    } catch {
      return null
    }
  }
  try {
    const bin = decodeURIComponent(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes.buffer
  } catch {
    return null
  }
}

interface Decoded {
  width: number
  height: number
  data: Uint8ClampedArray
}

function inflateRaw(input: Uint8Array): Uint8Array | null {
  const len = input.length
  if (len === 0) return new Uint8Array(0)
  let bit = 0
  let val = 0
  const out: number[] = []
  let pos = 0

  const readBits = (count: number): number => {
    while (bit < count) {
      if (pos >= len) throw new Error('eof')
      val |= input[pos++] << bit
      bit += 8
    }
    const r = val & ((1 << count) - 1)
    val >>>= count
    bit -= count
    return r
  }

  const lens = new Uint8Array(288)
  for (let i = 0; i < 143; i++) lens[i] = 8
  for (let i = 143; i < 255; i++) lens[i] = 9
  for (let i = 255; i < 280; i++) lens[i] = 7
  for (let i = 280; i < 288; i++) lens[i] = 8

  const build = (lencodes: Uint8Array, n: number): Int32Array | null => {
    const counts = new Uint8Array(n)
    for (let i = 0; i < lencodes.length; i++) counts[lencodes[i]]++
    counts[0] = 0
    const offs = new Int32Array(n + 1)
    for (let i = 0; i < n; i++) offs[i + 1] = offs[i] + counts[i]
    const tree = new Int32Array(lencodes.length)
    for (let i = 0; i < lencodes.length; i++) if (lencodes[i] > 0) tree[offs[lencodes[i]]++] = i
    return tree
  }

  const makeBitReader = (tree: Int32Array, lens: Uint8Array): (() => number) => {
    return () => {
      let code = 0
      let first = 0
      let index = 0
      for (let len = 1; len <= 15; len++) {
        code |= readBits(1)
        const count = lens2count(lens, len)
        if (code - first < count) return tree[index + (code - first)]
        index += count
        first += count
        first <<= 1
        code <<= 1
      }
      throw new Error('bad code')
    }
  }
  const lens2count = (lens: Uint8Array, length: number): number => {
    let c = 0
    for (let i = 0; i < lens.length; i++) if (lens[i] === length) c++
    return c
  }

  const decodeFixed = (readBits: (c: number) => number) => {
    const llens = lens.slice(0, 288)
    const ltree = build(llens, 9)!
    const dlens = new Uint8Array(30)
    for (let i = 0; i < 30; i++) dlens[i] = 5
    const dtree = build(dlens, 5)!
    const readLit = makeBitReader(ltree, llens)
    const readDist = makeBitReader(dtree, dlens)
    huffmanBlock(readBits, readLit, readDist, out)
  }

  const decodeDynamic = (readBits: (c: number) => number) => {
    const hlit = readBits(5) + 257
    const hdist = readBits(5) + 1
    const hclen = readBits(4) + 4
    const clOrder = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
    const clLens = new Uint8Array(19)
    for (let i = 0; i < hclen; i++) clLens[clOrder[i]] = readBits(3)
    const clTree = build(clLens, 7)!
    const readCl = makeBitReader(clTree, clLens)
    const total = hlit + hdist
    const allLens = new Uint8Array(total)
    let i = 0
    while (i < total) {
      const sym = readCl()
      if (sym < 16) {
        allLens[i++] = sym
      } else {
        let rep = 0
        let n = 0
        if (sym === 16) {
          if (i === 0) throw new Error('bad rep')
          n = readBits(2) + 3
          rep = allLens[i - 1]
        } else if (sym === 17) {
          n = readBits(3) + 3
          rep = 0
        } else {
          n = readBits(7) + 11
          rep = 0
        }
        for (let j = 0; j < n && i < total; j++) allLens[i++] = rep
      }
    }
    const ltree = build(allLens.slice(0, hlit), 15)!
    const dtree = build(allLens.slice(hlit), 15)!
    const llens = allLens.slice(0, hlit)
    const dlens2 = allLens.slice(hlit)
    const readLit = makeBitReader(ltree, llens)
    const readDist = makeBitReader(dtree, dlens2)
    huffmanBlock(readBits, readLit, readDist, out)
  }

  const huffmanBlock = (
    readBits: (c: number) => number,
    readLit: () => number,
    readDist: () => number,
    outArr: number[],
  ) => {
    const lengthBase = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
    const lengthExtra = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
    const distBase = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577]
    const distExtra = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
    for (;;) {
      const sym = readLit()
      if (sym < 256) {
        outArr.push(sym)
      } else if (sym === 256) {
        break
      } else {
        const li = sym - 257
        const length = lengthBase[li] + readBits(lengthExtra[li])
        const di = readDist()
        const dist = distBase[di] + readBits(distExtra[di])
        const start = outArr.length - dist
        for (let j = 0; j < length; j++) outArr.push(outArr[start + j])
      }
    }
  }

  try {
    for (;;) {
      const last = readBits(1)
      const type = readBits(2)
      if (type === 0) {
        const count = readBits(16)
        const skip = readBits(16)
        if (skip !== (count ^ 0xffff)) throw new Error('bad stored')
        for (let i = 0; i < count; i++) {
          while (bit >= 8) {
            out.push(val & 0xff)
            val >>>= 8
            bit -= 8
          }
          if (pos < len) {
            val |= input[pos++] << bit
            bit += 8
          }
        }
        val = 0
        bit = 0
      } else if (type === 1) {
        decodeFixed(readBits)
      } else if (type === 2) {
        decodeDynamic(readBits)
      } else {
        return null
      }
      if (last) break
    }
  } catch {
    return null
  }
  return Uint8Array.from(out)
}

function decodePng(buf: ArrayBuffer): Decoded | null {
  try {
    const dv = new DataView(buf)
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    for (let i = 0; i < 8; i++) if (dv.getUint8(i) !== sig[i]) return null
    let pos = 8
    let width = 0
    let height = 0
    let bitDepth = 0
    let colorType = 0
    const idat: number[] = []
    while (pos + 8 <= dv.byteLength) {
      const len = dv.getUint32(pos)
      const type = String.fromCharCode(dv.getUint8(pos + 4), dv.getUint8(pos + 5), dv.getUint8(pos + 6), dv.getUint8(pos + 7))
      const body = pos + 8
      if (type === 'IHDR') {
        width = dv.getUint32(body)
        height = dv.getUint32(body + 4)
        bitDepth = dv.getUint8(body + 8)
        colorType = dv.getUint8(body + 9)
      } else if (type === 'IDAT') {
        for (let i = 0; i < len; i++) idat.push(dv.getUint8(body + i))
      } else if (type === 'IEND') {
        break
      }
      pos = body + len + 4
    }
    if (!width || !height || bitDepth !== 8) return null
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 4 ? 2 : 0
    if (!channels) return null
    const stride = width * channels
    const expected = (stride + 1) * height
    const idatArr = Uint8Array.from(idat)
    let raw = inflateRaw(idatArr)
    if (raw === null || raw.length < expected) {
      // Fall back to treating the IDAT bytes directly as raw filter data
      // (handles uncompressed / non-deflate IDAT payloads).
      if (idatArr.length < expected) return null
      raw = idatArr
    }
    const prev = new Uint8Array(stride)
    const cur = new Uint8Array(stride)
    const px = new Uint8ClampedArray(width * height * 4)
    let rp = 0
    for (let y = 0; y < height; y++) {
      const filter = raw[rp++]
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? cur[x - channels] : 0
        const b = prev[x]
        const c = x >= channels ? prev[x - channels] : 0
        let v = raw[rp++]
        if (filter === 1) v = v + a
        else if (filter === 2) v = v + b
        else if (filter === 3) v = v + ((a + b) >> 1)
        else if (filter === 4) {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          v = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)
        }
        cur[x] = v & 0xff
      }
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4
        if (channels === 4) {
          px[o] = cur[x * 4]
          px[o + 1] = cur[x * 4 + 1]
          px[o + 2] = cur[x * 4 + 2]
          px[o + 3] = cur[x * 4 + 3]
        } else if (channels === 3) {
          px[o] = cur[x * 3]
          px[o + 1] = cur[x * 3 + 1]
          px[o + 2] = cur[x * 3 + 2]
          px[o + 3] = 255
        } else if (channels === 2) {
          const g = cur[x * 2]
          px[o] = g
          px[o + 1] = g
          px[o + 2] = g
          px[o + 3] = cur[x * 2 + 1]
        } else {
          const g = cur[x]
          px[o] = g
          px[o + 1] = g
          px[o + 2] = g
          px[o + 3] = 255
        }
      }
      cur.set(prev)
    }
    return { width, height, data: px }
  } catch {
    return null
  }
}

function statusText(rec: ImageRecord): string {
  const ops: string[] = []
  if (rec.flipH) ops.push('Flipped H')
  if (rec.flipV) ops.push('Flipped V')
  if (rec.rotations % 4 !== 0) ops.push(`Rotated ${rec.rotations * 90}°`)
  return ops.length === 0 ? `Loaded: ${rec.name}` : `Loaded: ${rec.name} (${ops.join(', ')})`
}

export function App() {
  const [initial] = useState(() => loadImage())
  const [record, setRecord] = useState<ImageRecord | null>(initial)
  const [dragging, setDragging] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const update = (patch: Partial<ImageRecord>) => {
    setRecord((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      saveImage(next)
      return next
    })
  }

  const rotate = () => {
    setRecord((prev) => {
      if (!prev) return prev
      const next = { ...prev, rotations: (prev.rotations + 1) % 4 }
      saveImage(next)
      return next
    })
  }

  const applyFile = (file: File | undefined | null) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      const img = new Image()
      img.onload = () => {
        const next: ImageRecord = {
          id: 'image',
          name: file.name,
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          flipH: false,
          flipV: false,
          rotations: 0,
        }
        saveImage(next)
        setRecord(next)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas || !record) return
    const scale = Math.min(1, MAX_SCALE / Math.max(canvas.width, canvas.height, 1))
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(canvas.width * scale))
    out.height = Math.max(1, Math.round(canvas.height * scale))
    const ctx = out.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = scale < 1
    ctx.drawImage(canvas, 0, 0, out.width, out.height)
    out.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const base = record.name.replace(/\.png$/i, '')
      link.href = url
      link.download = `${base}_flipped.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    applyFile(event.dataTransfer.files[0])
  }

  const hasImage = record !== null

  useEffect(() => {
    if (!hasImage) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rot = ((record.rotations % 4) + 4) % 4
    const width = rot === 1 || rot === 3 ? record.height : record.width
    const height = rot === 1 || rot === 3 ? record.width : record.height
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const buf = dataUrlToArrayBuffer(record.dataUrl)
    const decoded = buf ? decodePng(buf) : null
    if (!decoded) return
    const src = decoded.data
    const w = decoded.width
    const h = decoded.height
    const flippedX = record.flipH
    const flippedY = record.flipV
    const out = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = flippedX ? w - 1 - x : x
        const sy = flippedY ? h - 1 - y : y
        const s = (sy * w + sx) * 4
        let tx: number
        let ty: number
        if (rot === 0) {
          tx = x
          ty = y
        } else if (rot === 1) {
          tx = h - 1 - y
          ty = x
        } else if (rot === 2) {
          tx = w - 1 - x
          ty = h - 1 - y
        } else {
          tx = y
          ty = w - 1 - x
        }
        const d = (ty * width + tx) * 4
        out[d] = src[s]
        out[d + 1] = src[s + 1]
        out[d + 2] = src[s + 2]
        out[d + 3] = src[s + 3]
      }
    }
    ctx.putImageData(new ImageData(out, width, height), 0, 0)
  }, [hasImage, record])

  return (
    <main className="flip-app">
      <Card mono="Image">
        <Stack lg>
          <h1 className="lc-title lc-title-lg">Image Flipper</h1>
          <input
            ref={fileRef}
            type="file"
            accept="image/png"
            aria-label="Choose an image"
            className="flip-file"
            onChange={(event) => {
              applyFile(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <div
            className={`flip-drop${dragging ? ' dragging' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            {hasImage ? (
              <div className="flip-preview">
                <canvas ref={canvasRef} className="flip-canvas" />
              </div>
            ) : (
              <Body>Drop an image or click to browse</Body>
            )}
          </div>
          <MonoLabel style={{ minHeight: 'calc(12px * var(--tf))' }}>
            {hasImage ? statusText(record) : 'No image loaded'}
          </MonoLabel>
          <div className="flip-actions">
            <Btn kind="secondary" disabled={!hasImage} onClick={() => update({ flipH: !record?.flipH })}>
              Flip H
            </Btn>
            <Btn kind="secondary" disabled={!hasImage} onClick={() => update({ flipV: !record?.flipV })}>
              Flip V
            </Btn>
            <Btn kind="secondary" disabled={!hasImage} onClick={rotate}>
              Rotate 90°
            </Btn>
            <Btn kind="primary" disabled={!hasImage} onClick={download}>
              Download
            </Btn>
          </div>
        </Stack>
      </Card>
    </main>
  )
}
