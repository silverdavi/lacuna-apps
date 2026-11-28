// Browser side of the comparison: decoding, resizing and the row-chunked diff.
import { accumulateRows, createAccumulator, finalizeStats, fitScale, type DiffResult, type Pixels } from './diff.ts'

export const MAX_SIDE = 4096
export const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp', 'image/avif']
export const ACCEPT_ATTR = ACCEPTED.join(',')

export interface Source {
  name: string
  bitmap: ImageBitmap
}

export interface Prepared {
  width: number
  height: number
  canvasA: HTMLCanvasElement
  canvasB: HTMLCanvasElement
  pixelsA: Pixels
  pixelsB: Pixels
  notices: string[]
}

export async function decode(file: File): Promise<Source> {
  if (!ACCEPTED.includes(file.type)) {
    const kind = file.type || 'an unknown type'
    throw new Error(`${file.name} is ${kind}, not a supported image. Use PNG, JPEG, WebP, GIF, BMP or AVIF.`)
  }
  try {
    return { name: file.name, bitmap: await createImageBitmap(file) }
  } catch {
    throw new Error(`${file.name} could not be decoded. The file may be damaged.`)
  }
}

function paint(bitmap: ImageBitmap, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas
}

export function prepare(a: Source, b: Source): Prepared {
  const aw = a.bitmap.width, ah = a.bitmap.height
  const bw = b.bitmap.width, bh = b.bitmap.height
  const scale = fitScale(aw, ah, MAX_SIDE)
  const width = Math.max(1, Math.round(aw * scale))
  const height = Math.max(1, Math.round(ah * scale))
  const notices: string[] = []
  if (bw !== aw || bh !== ah) notices.push(`B was resized from ${bw}x${bh} to ${aw}x${ah} to compare`)
  if (scale < 1) notices.push(`Very large image: both were downscaled from ${aw}x${ah} to ${width}x${height} (longest side limit ${MAX_SIDE}) to keep the browser responsive`)
  const canvasA = paint(a.bitmap, width, height)
  const canvasB = paint(b.bitmap, width, height)
  const read = (c: HTMLCanvasElement): Pixels => {
    const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, width, height)
    return { data: d.data, width, height }
  }
  return { width, height, canvasA, canvasB, pixelsA: read(canvasA), pixelsB: read(canvasB), notices }
}

const nextFrame = () =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 60)
    requestAnimationFrame(() => {
      clearTimeout(t)
      resolve()
    })
  })

/** Diff in row chunks, yielding to the browser between chunks. Resolves null when cancelled. */
export async function runDiff(
  a: Pixels,
  b: Pixels,
  threshold: number,
  onProgress: (fraction: number) => void,
  cancelled: () => boolean,
): Promise<DiffResult | null> {
  const sums = new Uint16Array(a.width * a.height)
  const acc = createAccumulator()
  const rowsPerChunk = Math.max(16, Math.floor(2_000_000 / a.width))
  for (let y = 0; y < a.height; y += rowsPerChunk) {
    if (cancelled()) return null
    accumulateRows(acc, a, b, sums, threshold, y, Math.min(a.height, y + rowsPerChunk))
    onProgress(Math.min(1, (y + rowsPerChunk) / a.height))
    if (y + rowsPerChunk < a.height) await nextFrame()
  }
  if (cancelled()) return null
  return { sums, stats: finalizeStats(acc, a.width, a.height), threshold }
}

export function toCanvas(p: Pixels): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = p.width
  canvas.height = p.height
  canvas.getContext('2d')!.putImageData(new ImageData(p.data as Uint8ClampedArray<ArrayBuffer>, p.width, p.height), 0, 0)
  return canvas
}

export const canvasBlob = (c: HTMLCanvasElement): Promise<Blob | null> => new Promise((r) => c.toBlob(r, 'image/png'))
