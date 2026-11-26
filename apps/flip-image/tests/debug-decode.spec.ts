import { test } from '@playwright/test'

function readBE32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]
  )
}

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

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  if (pb <= pc) return b
  return c
}

function decodePngSync(dataUrl: string) {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return null
  const meta = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  if (!meta.includes('base64')) return null
  const bin = atob(payload)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

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
    return { error: 'neither raw nor zlib' }
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
    }
    prevRow = curRow
  }
  return { width, height, data: out }
}

test('test png decode', async ({ page }) => {
  await page.goto('about:blank')
  const result = await page.evaluate(() => {
    // Build the same PNG as the test
    const W = 100
    const H = 50
    const raw = new Uint8Array((W * 3 + 1) * H)
    for (let y = 0; y < H; y++) {
      const row = y * (W * 3 + 1)
      raw[row] = 0
      for (let x = 0; x < W; x++) {
        const off = row + 1 + x * 3
        raw[off] = x < W / 2 ? 255 : 0
        raw[off + 1] = x < W / 2 ? 0 : 255
        raw[off + 2] = 0
      }
    }
    // Build a minimal PNG manually (skip zlib, use raw IDAT)
    const crcTable = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
    const crc = (buf: Uint8Array) => {
      let c = -1
      for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
      return (c ^ -1) >>> 0
    }
    const chunk = (type: string, data: Uint8Array) => {
      const len = new Uint8Array(4)
      len[0] = (data.length >> 24) & 0xff
      len[1] = (data.length >> 16) & 0xff
      len[2] = (data.length >> 8) & 0xff
      len[3] = data.length & 0xff
      const body = new Uint8Array(4 + data.length)
      body.set([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)], 0)
      body.set(data, 4)
      const crcv = new Uint8Array(4)
      const c = crc(body)
      crcv[0] = (c >>> 24) & 0xff
      crcv[1] = (c >>> 16) & 0xff
      crcv[2] = (c >>> 8) & 0xff
      crcv[3] = c & 0xff
      return new Uint8Array([...len, ...body, ...crcv])
    }
    const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const ihdr = new Uint8Array(13)
    ihdr[0] = (W >> 24) & 0xff
    ihdr[1] = (W >> 16) & 0xff
    ihdr[2] = (W >> 8) & 0xff
    ihdr[3] = W & 0xff
    ihdr[4] = (H >> 24) & 0xff
    ihdr[5] = (H >> 16) & 0xff
    ihdr[6] = (H >> 8) & 0xff
    ihdr[7] = H & 0xff
    ihdr[8] = 8
    ihdr[9] = 2
    const png = new Uint8Array(
      [...sig, ...chunk('IHDR', ihdr), ...chunk('IDAT', raw), ...chunk('IEND', new Uint8Array(0))],
    )
    const b64 = btoa(String.fromCharCode(...png))
    const dataUrl = `data:image/png;base64,${b64}`
    return { dataUrl, pngLen: png.length, rawLen: raw.length }
  })
  console.log('PNG info:', JSON.stringify(result))

  const decoded = await page.evaluate((dataUrl) => {
    // Re-implement decodePng inline since we can't import from the app
    const comma = dataUrl.indexOf(',')
    const meta = dataUrl.slice(0, comma)
    const payload = dataUrl.slice(comma + 1)
    const bin = atob(payload)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)

    const readBE32 = (b: Uint8Array, off: number) =>
      (b[off] << 24) | (b[off + 1] << 16) | (b[off + 2] << 8) | b[off + 3]

    let width = 0, height = 0, bitDepth = 0, colorType = 0
    const idatParts: Uint8Array[] = []
    let idatTotal = 0
    let offset = 8
    while (offset + 12 <= bytes.length) {
      const len = readBE32(bytes, offset) >>> 0
      const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
      const start = offset + 8
      if (start + len > bytes.length) break
      if (type === 'IHDR') {
        width = readBE32(bytes, start) >>> 0
        height = readBE32(bytes, start + 4) >>> 0
        bitDepth = bytes[start + 8]
        colorType = bytes[start + 9]
      } else if (type === 'IDAT') {
        idatParts.push(bytes.subarray(start, start + len))
        idatTotal += len
      } else if (type === 'IEND') {
        break
      }
      offset = start + len + 4
    }

    const idat = new Uint8Array(idatTotal)
    let p = 0
    for (const part of idatParts) {
      idat.set(part, p)
      p += part.length
    }

    const channels = colorType === 2 ? 3 : 4
    const expected = height * (width * channels + 1)
    console.log('parsed:', { width, height, bitDepth, colorType, idatLen: idat.length, expected })
    if (idat.length !== expected) return { error: `idat length mismatch: ${idat.length} vs ${expected}` }

    const scanlines = idat
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
                  : value + 0
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
      }
      prevRow = curRow
    }

    let red = 0, green = 0, zero = 0
    for (let i = 0; i < out.length; i += 4) {
      if (out[i] === 0 && out[i + 1] === 0 && out[i + 2] === 0 && out[i + 3] === 0) zero++
      if (out[i] > out[i + 1]) red++
      else if (out[i + 1] > out[i]) green++
    }
    return {
      red,
      green,
      zero,
      total: out.length / 4,
      first: Array.from(out.subarray(0, 4)),
      mid: Array.from(out.subarray((width * 25 + 50) * 4, (width * 25 + 50) * 4 + 4)),
    }
  }, result.dataUrl)
  console.log('DECODED:', JSON.stringify(decoded, null, 2))
})
