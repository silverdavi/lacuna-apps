// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type ImageTargetFormat = 'png' | 'jpeg' | 'webp' | 'bmp' | 'ico' | 'qoi' | 'svg' | 'datauri'

export interface ImageConvertOptions {
  format: ImageTargetFormat
  quality: number // 0.1 - 1.0
  scale: number // 0.25, 0.5, 0.75, 1
  rotation: 0 | 90 | 180 | 270
  grayscale: boolean
}

export interface ImageConvertResult {
  blob: Blob
  outputName: string
  mime: string
  width: number
  height: number
  inputBytes: number
  outputBytes: number
  previewUrl: string | null
}

export const IMAGE_FORMATS: Array<{ id: ImageTargetFormat; label: string; ext: string; mime: string }> = [
  { id: 'png', label: 'PNG (Lossless)', ext: 'png', mime: 'image/png' },
  { id: 'jpeg', label: 'JPEG', ext: 'jpg', mime: 'image/jpeg' },
  { id: 'webp', label: 'WebP', ext: 'webp', mime: 'image/webp' },
  { id: 'bmp', label: 'BMP (24-bit)', ext: 'bmp', mime: 'image/bmp' },
  { id: 'ico', label: 'ICO (Icon)', ext: 'ico', mime: 'image/x-icon' },
  { id: 'qoi', label: 'QOI (Quite OK Image)', ext: 'qoi', mime: 'image/qoi' },
  { id: 'svg', label: 'SVG Wrapper', ext: 'svg', mime: 'image/svg+xml' },
  { id: 'datauri', label: 'Data URI (.txt)', ext: 'datauri.txt', mime: 'text/plain;charset=utf-8' },
]

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

// Pure-TS 24-bit uncompressed BMP encoder
function encodeBmp(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData
  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelArraySize = rowSize * height
  const fileSize = 54 + pixelArraySize
  const buf = new Uint8Array(fileSize)
  const view = new DataView(buf.buffer)

  buf[0] = 0x42
  buf[1] = 0x4d
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelArraySize, true)

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y
    const rowOff = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const s = (srcY * width + x) * 4
      const d = rowOff + x * 3
      buf[d] = data[s + 2] ?? 0
      buf[d + 1] = data[s + 1] ?? 0
      buf[d + 2] = data[s] ?? 0
    }
  }
  return buf
}

// Pure-TS ICO container embedding PNG bytes
function encodeIcoFromPng(pngBytes: Uint8Array, width: number, height: number): Uint8Array {
  const header = new Uint8Array(22)
  const view = new DataView(header.buffer)
  view.setUint16(0, 0, true)
  view.setUint16(2, 1, true) // ICO type
  view.setUint16(4, 1, true) // 1 image
  header[6] = width >= 256 ? 0 : width
  header[7] = height >= 256 ? 0 : height
  header[8] = 0
  header[9] = 0
  view.setUint16(10, 1, true)
  view.setUint16(12, 32, true)
  view.setUint32(14, pngBytes.length, true)
  view.setUint32(18, 22, true)

  const out = new Uint8Array(22 + pngBytes.length)
  out.set(header, 0)
  out.set(pngBytes, 22)
  return out
}

// Pure-TS QOI (Quite OK Image) lossless RGBA encoder adapted from phoboslab/qoi (MIT)
function encodeQoi(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData
  const maxLen = width * height * 5 + 14 + 8
  const bytes = new Uint8Array(maxLen)
  const view = new DataView(bytes.buffer)

  // Magic "qoif"
  bytes[0] = 0x71
  bytes[1] = 0x6f
  bytes[2] = 0x69
  bytes[3] = 0x66
  view.setUint32(4, width, false)
  view.setUint32(8, height, false)
  bytes[12] = 4 // RGBA
  bytes[13] = 0 // sRGB

  let p = 14
  const index = new Uint8Array(64 * 4)
  let r = 0
  let g = 0
  let b = 0
  let a = 255
  let run = 0
  const lastPixel = width * height * 4 - 4

  for (let pxPos = 0; pxPos <= lastPixel; pxPos += 4) {
    const pr = data[pxPos]!
    const pg = data[pxPos + 1]!
    const pb = data[pxPos + 2]!
    const pa = data[pxPos + 3]!

    if (pr === r && pg === g && pb === b && pa === a) {
      run++
      if (run === 62 || pxPos === lastPixel) {
        bytes[p++] = 0xc0 | (run - 1)
        run = 0
      }
    } else {
      if (run > 0) {
        bytes[p++] = 0xc0 | (run - 1)
        run = 0
      }
      const idxPos = ((pr * 3 + pg * 5 + pb * 7 + pa * 11) % 64) * 4
      if (
        index[idxPos] === pr &&
        index[idxPos + 1] === pg &&
        index[idxPos + 2] === pb &&
        index[idxPos + 3] === pa
      ) {
        bytes[p++] = idxPos >> 2
      } else {
        index[idxPos] = pr
        index[idxPos + 1] = pg
        index[idxPos + 2] = pb
        index[idxPos + 3] = pa

        if (pa === a) {
          const vr = ((pr - r + 128) & 0xff) - 128
          const vg = ((pg - g + 128) & 0xff) - 128
          const vb = ((pb - b + 128) & 0xff) - 128
          const vgR = vr - vg
          const vgB = vb - vg

          if (vr > -3 && vr < 2 && vg > -3 && vg < 2 && vb > -3 && vb < 2) {
            bytes[p++] = 0x40 | ((vr + 2) << 4) | ((vg + 2) << 2) | (vb + 2)
          } else if (vgR > -9 && vgR < 8 && vg > -33 && vg < 32 && vgB > -9 && vgB < 8) {
            bytes[p++] = 0x80 | (vg + 32)
            bytes[p++] = ((vgR + 8) << 4) | (vgB + 8)
          } else {
            bytes[p++] = 0xfe
            bytes[p++] = pr
            bytes[p++] = pg
            bytes[p++] = pb
          }
        } else {
          bytes[p++] = 0xff
          bytes[p++] = pr
          bytes[p++] = pg
          bytes[p++] = pb
          bytes[p++] = pa
        }
      }
      r = pr
      g = pg
      b = pb
      a = pa
    }
  }

  // 8-byte QOI end marker
  for (let i = 0; i < 7; i++) bytes[p++] = 0
  bytes[p++] = 1
  return bytes.subarray(0, p)
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b)
        else reject(new Error(`Browser could not encode ${mime}`))
      },
      mime,
      quality,
    )
  })
}

export async function createSampleImageFile(): Promise<File> {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 320
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(245, 241, 232)'
  ctx.fillRect(0, 0, 480, 320)
  ctx.fillStyle = 'rgb(34, 87, 166)'
  ctx.fillRect(40, 40, 180, 240)
  ctx.fillStyle = 'rgb(196, 77, 45)'
  ctx.beginPath()
  ctx.arc(320, 160, 92, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgb(28, 28, 30)'
  ctx.font = 'bold 18pt sans-serif'
  ctx.fillText('SAMPLE 480x320', 54, 298)
  const blob = await canvasToBlob(canvas, 'image/png', 1)
  return new File([blob], 'sample-poster.png', { type: 'image/png' })
}

export async function convertImage(file: File, options: ImageConvertOptions): Promise<ImageConvertResult> {
  const url = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`Could not decode ${file.name} as an image`))
      el.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }

  const baseW = Math.max(1, Math.round((img.naturalWidth || 1) * options.scale))
  const baseH = Math.max(1, Math.round((img.naturalHeight || 1) * options.scale))
  const swap = options.rotation === 90 || options.rotation === 270
  const outW = swap ? baseH : baseW
  const outH = swap ? baseW : baseH

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')!

  if (options.format === 'jpeg' || options.format === 'bmp') {
    ctx.fillStyle = 'rgb(255, 255, 255)'
    ctx.fillRect(0, 0, outW, outH)
  }

  ctx.save()
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate((options.rotation * Math.PI) / 180)
  ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH)
  ctx.restore()

  if (options.grayscale) {
    const imgData = ctx.getImageData(0, 0, outW, outH)
    const d = imgData.data
    for (let i = 0; i < d.length; i += 4) {
      const luma = Math.round(0.2126 * d[i]! + 0.7152 * d[i + 1]! + 0.0722 * d[i + 2]!)
      d[i] = luma
      d[i + 1] = luma
      d[i + 2] = luma
    }
    ctx.putImageData(imgData, 0, 0)
  }

  const info = IMAGE_FORMATS.find((f) => f.id === options.format)!
  const baseName = file.name.includes('.') ? file.name.replace(/\.[^.]+$/, '') : file.name
  const outputName = `${baseName}.${info.ext}`

  let blob: Blob
  let previewUrl: string | null = null

  if (options.format === 'png' || options.format === 'jpeg' || options.format === 'webp') {
    blob = await canvasToBlob(canvas, info.mime, options.quality)
    previewUrl = URL.createObjectURL(blob)
  } else if (options.format === 'bmp') {
    const bmpBytes = encodeBmp(ctx.getImageData(0, 0, outW, outH))
    blob = new Blob([bmpBytes as BlobPart], { type: info.mime })
    previewUrl = URL.createObjectURL(blob)
  } else if (options.format === 'ico') {
    const iconCanvas = document.createElement('canvas')
    const s = Math.min(256, Math.max(outW, outH))
    iconCanvas.width = s
    iconCanvas.height = s
    const ictx = iconCanvas.getContext('2d')!
    ictx.drawImage(canvas, 0, 0, s, s)
    const pngBlob = await canvasToBlob(iconCanvas, 'image/png', 1)
    const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())
    const icoBytes = encodeIcoFromPng(pngBytes, s, s)
    blob = new Blob([icoBytes as BlobPart], { type: info.mime })
    previewUrl = URL.createObjectURL(pngBlob)
  } else if (options.format === 'qoi') {
    const qoiBytes = encodeQoi(ctx.getImageData(0, 0, outW, outH))
    blob = new Blob([qoiBytes as BlobPart], { type: info.mime })
  } else if (options.format === 'svg') {
    const dataUrl = canvas.toDataURL('image/png')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" viewBox="0 0 ${outW} ${outH}"><image href="${dataUrl}" width="${outW}" height="${outH}"/></svg>`
    blob = new Blob([svg], { type: info.mime })
    previewUrl = URL.createObjectURL(blob)
  } else {
    const dataUrl = canvas.toDataURL('image/png')
    blob = new Blob([dataUrl], { type: info.mime })
  }

  return {
    blob,
    outputName,
    mime: info.mime,
    width: outW,
    height: outH,
    inputBytes: file.size,
    outputBytes: blob.size,
    previewUrl,
  }
}

// Pure-TS ZIP packer for batch download
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[i] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export async function packResultsAsZip(items: ImageConvertResult[]): Promise<Blob> {
  const enc = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const item of items) {
    const data = new Uint8Array(await item.blob.arrayBuffer())
    const nameBytes = enc.encode(item.outputName)
    const crc = crc32(data)

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, data.length, true)
    lv.setUint32(22, data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    locals.push(local, data)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, data.length, true)
    cv.setUint32(24, data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)
    offset += local.length + data.length
  }

  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, items.length, true)
  ev.setUint16(10, items.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)

  const out = new Uint8Array(offset + centralSize + 22)
  let pos = 0
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, pos)
    pos += part.length
  }
  return new Blob([out], { type: 'application/zip' })
}
