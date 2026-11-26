// Throwaway verification harness (not a spec): encodes sample GIFs with the same
// LZW/quantizer logic as src/gif.ts and writes them for a Pillow cross-check.
const MIN_CODE_SIZE = 8
const LZW_EOI = 257
const LZW_MAX_CODE = 4096
const PALETTE = (() => {
  const c = []
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) c.push((r * 42 + 13 << 16) | (g * 42 + 13 << 8) | (b * 42 + 13))
  for (let i = 0; i < 40; i++) { const g = Math.round((i / 39) * 255); c.push((g << 16) | (g << 8) | g) }
  return c
})()
function quantize(rgba, w, h) {
  const index = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2]
    let best = 0, bd = Infinity
    for (let p = 0; p < 256; p++) {
      const pr = PALETTE[p] >>> 16, pg = (PALETTE[p] >>> 8) & 255, pb = PALETTE[p] & 255
      const dr = r - pr, dg = g - pg, db = b - pb
      const d = dr * dr * 2 + dg * dg * 2 + db * db
      if (d < bd) { bd = d; best = p }
    }
    index[i] = best
  }
  return index
}
function lzwEncode(data) {
  const out = []
  let cur = 0, nbits = 0, codeSize = 9, nextCode = 258
  const dict = new Int32Array(LZW_MAX_CODE * 256).fill(-1)
  const put = (v, len) => {
    cur |= (v & ((1 << len) - 1)) << nbits
    nbits += len
    while (nbits >= 8) { out.push(cur & 0xff); cur = Math.floor(cur / 256); nbits -= 8 }
  }
  let k = -1
  for (let i = 0; i < data.length; i++) {
    const c = data[i]
    if (k === -1) { k = c; continue }
    const key = k * 256 + c
    const p = key < dict.length ? dict[key] : -1
    if (p === -1) {
      put(k, codeSize)
      if (nextCode < LZW_MAX_CODE) {
        dict[key] = nextCode
        nextCode += 1
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1
      }
      k = c
    } else k = p
  }
  if (k !== -1) put(k, codeSize)
  put(257, codeSize)
  if (nbits > 0) out.push(cur & 0xff)
  return Uint8Array.from(out)
}
function lzwBlock(bytes) {
  const encoded = lzwEncode(bytes)
  const out = [MIN_CODE_SIZE]
  for (let i = 0; i < encoded.length; i += 255) { const ch = encoded.slice(i, i + 255); out.push(ch.length, ...ch) }
  out.push(0)
  return out
}
function encodeGif(frames, delayMs, width, height) {
  const out = []
  const SIG = 'GIF89a'
  for (let i = 0; i < SIG.length; i++) out.push(SIG.charCodeAt(i))
  out.push(width & 255, width >> 8, height & 255, height >> 8, 0xf7, 0, 0)
  for (const c of PALETTE) out.push((c >> 16) & 255, (c >> 8) & 255, c & 255)
  const delayCs = Math.max(0, Math.round(delayMs / 10))
  for (const f of frames) {
    const idx = quantize(f.rgba, f.width, f.height)
    out.push(0x21, 0xf9, 0x04, 0x01, delayCs & 255, delayCs >> 8, 0, 0)
    out.push(0x2c, 0, 0, 0, 0, width & 255, width >> 8, height & 255, height >> 8, 0)
    out.push(...lzwBlock(idx))
  }
  out.push(0x3b)
  return Uint8Array.from(out)
}

import { writeFileSync } from 'node:fs'
const w = 16, h = 8
const solid = (r, g, b) => {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255 }
  return { rgba: d, width: w, height: h }
}
const varied = () => {
  const d = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) { d[i * 4] = (i * 7) % 256; d[i * 4 + 1] = (i * 13) % 256; d[i * 4 + 2] = (i * 29) % 256; d[i * 4 + 3] = 255 }
  return { rgba: d, width: w, height: h }
}
const a = encodeGif([solid(220, 30, 30), solid(30, 200, 40), solid(40, 60, 230)], 200, w, h)
const b = encodeGif([varied(), varied()], 100, w, h)
writeFileSync('tests/out-a.gif', a)
writeFileSync('tests/out-b.gif', b)
console.log('a', a.length, 'b', b.length)
