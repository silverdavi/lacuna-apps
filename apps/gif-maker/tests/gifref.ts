// Reference GIF89a + LZW decoder, used only in tests to verify the encoder's output.
// No dependencies; byte-accurate against the GIF spec.

export interface DecodedGif {
  width: number
  height: number
  frames: { indices: Uint8Array; delayCs: number }[]
}

export function decodeGif(bytes: Uint8Array): DecodedGif {
  const sig = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!)
  if (sig !== 'GIF89a') throw new Error('bad signature: ' + sig)
  const width = bytes[6]! | (bytes[7]! << 8)
  const height = bytes[8]! | (bytes[9]! << 8)
  const packed = bytes[10]!
  const gctSize = packed & 0x80 ? 1 << ((packed & 0x07) + 1) : 0
  let pos = 13 + gctSize * 3

  const frames: { indices: Uint8Array; delayCs: number }[] = []
  while (pos < bytes.length) {
    const marker = bytes[pos]!
    pos++
    if (marker === 0x3b) break
    if (marker === 0x21) {
      const label = bytes[pos]!
      pos++
      if (label === 0xf9) {
        const size = bytes[pos]!
        if (size !== 4) throw new Error('bad GCE size ' + size)
        const delay = bytes[pos + 2]! | (bytes[pos + 3]! << 8)
        pos += 1 + size + 1
        frames.push({ indices: new Uint8Array(0), delayCs: delay })
        continue
      }
      let size = bytes[pos]!
      pos++
      while (size !== 0) {
        pos += size
        size = bytes[pos]!
        pos++
      }
      continue
    }
    if (marker === 0x2c) {
      const w = bytes[pos + 4]! | (bytes[pos + 5]! << 8)
      const h = bytes[pos + 6]! | (bytes[pos + 7]! << 8)
      const lctPacked = bytes[pos + 8]!
      const lctSize = lctPacked & 0x80 ? 1 << ((lctPacked & 0x07) + 1) : 0
      pos += 9 + lctSize * 3
      const minCode = bytes[pos]!
      const lzwStart = pos + 1
      const indices = lzwDecode(bytes, lzwStart, minCode, w * h)
      frames[frames.length - 1].indices = indices
      pos = lzwStart + consumed(bytes, lzwStart)
      continue
    }
    throw new Error('unexpected marker ' + marker.toString(16))
  }
  return { width, height, frames }
}

function consumed(bytes: Uint8Array, pos: number): number {
  let p = pos
  while (bytes[p]! !== 0) p += bytes[p]! + 1
  return p - pos + 1
}

// Spec-conformant LZW decoder: variable code width grows when a new code is
// assigned at exactly (1 << codeSize) - 1, and codes are read LSB-first.
function lzwDecode(bytes: Uint8Array, start: number, minCodeSize: number, expect: number): Uint8Array {
  const clear = 1 << minCodeSize
  const eoi = clear + 1
  const out = new Uint8Array(expect)
  const dict: number[][] = []
  for (let i = 0; i < 256; i++) dict[i] = [i]
  let dictSize = eoi + 1
  let codeSize = minCodeSize + 1

  const stream: number[] = []
  let p = start
  let block = bytes[p]!
  p++
  while (block !== 0) {
    for (let i = 0; i < block; i++) stream.push(bytes[p + i]!)
    p += block
    block = bytes[p]!
    p++
  }

  let cur = 0
  let nbits = 0
  let si = 0
  const readCode = (): number => {
    while (nbits < codeSize) {
      if (si >= stream.length) throw new Error('LZW stream exhausted')
      cur |= stream[si]! << nbits
      si++
      nbits += 8
    }
    const code = cur & ((1 << codeSize) - 1)
    cur = Math.floor(cur / (1 << codeSize))
    nbits -= codeSize
    return code
  }

  let oi = 0
  let prev: number[] | null = null
  let first = true
  while (true) {
    const code = readCode()
    if (code === clear) {
      dict.length = 256
      for (let i = 0; i < 256; i++) dict[i] = [i]
      dictSize = eoi + 1
      codeSize = minCodeSize + 1
      prev = null
      first = true
      continue
    }
    if (code === eoi) break
    let entry: number[]
    if (code < dictSize) entry = dict[code]!.slice()
    else if (code === dictSize && prev) entry = prev.slice().concat(prev[0]!)
    else throw new Error('invalid code ' + code + ' dictSize ' + dictSize)
    if (oi + entry.length > expect) throw new Error('too many pixels: ' + (oi + entry.length) + ' > ' + expect)
    for (const v of entry) out[oi++] = v
    if (!first && prev) {
      dict[dictSize] = prev.slice().concat(entry[0]!)
      dictSize++
      if (dictSize === (1 << codeSize) && codeSize < 12) codeSize++
    }
    prev = entry
    first = false
  }
  if (oi !== expect) throw new Error('LZW produced ' + oi + ' pixels, expected ' + expect)
  return out
}
