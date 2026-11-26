const MIN_CODE_SIZE = 8
const LZW_MAX_CODE = 4096
const PALETTE = (() => {
  const c = []
  for (let r = 0; r < 6; r++) for (let g = 0; g < 6; g++) for (let b = 0; b < 6; b++) c.push((r * 42 + 13 << 16) | (g * 42 + 13 << 8) | (b * 42 + 13))
  for (let i = 0; i < 40; i++) { const g = Math.round((i / 39) * 255); c.push((g << 16) | (g << 8) | g) }
  return c
})()
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
  return out
}
function lzwBlock(bytes) {
  const encoded = lzwEncode(bytes)
  const out = [MIN_CODE_SIZE]
  for (let i = 0; i < encoded.length; i += 255) { const ch = encoded.slice(i, i + 255); out.push(ch.length, ...ch) }
  out.push(0)
  return out
}
function encodeGif(indices, delayMs, width, height) {
  const out = []
  for (let i = 0; i < 6; i++) out.push('GIF89a'.charCodeAt(i))
  out.push(width & 0xff, width >> 8, height & 0xff, height >> 8, 0xf7, 0, 0)
  for (const c of PALETTE) out.push((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff)
  const delayCs = Math.max(0, Math.round(delayMs / 10))
  out.push(0x21, 0xf9, 0x04, 0x01, delayCs & 0xff, delayCs >> 8, 0, 0)
  out.push(0x2c, 0, 0, 0, 0, width & 0xff, width >> 8, height & 0xff, height >> 8, 0)
  out.push(...lzwBlock(indices))
  out.push(0x3b)
  return out
}
import { writeFileSync } from 'node:fs'
const w = 16, h = 8
const indices = []
for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) indices.push(x < w / 2 ? 5 : 100)
const gif = encodeGif(indices, 100, w, h)
writeFileSync('tests/lzw_test4.gif', Buffer.from(gif))
console.log('wrote', gif.length, 'bytes')
