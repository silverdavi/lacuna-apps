// Minimal grayscale PNG encode/decode, no dependencies, no network.

let crcTable: number[] | null = null
function crc32(bytes: number[]): number {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let c = 0xffffffff
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function typeToBytes(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0))
}

function adler32(bytes: number[]): number {
  let a = 1
  let b = 0
  for (const x of bytes) {
    a = (a + x) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

function deflateStored(bytes: number[]): number[] {
  const out: number[] = [0x78, 0x01]
  for (let i = 0; i < bytes.length; i += 65535) {
    const chunk = bytes.slice(i, i + 65535)
    const last = i + 65535 >= bytes.length ? 1 : 0
    const len = chunk.length
    out.push(last, len & 0xff, (len >>> 8) & 0xff, (~len) & 0xff, ((~len) >>> 8) & 0xff)
    out.push(...chunk)
  }
  const adler = adler32(bytes)
  out.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff)
  return out
}

export function encodePng(size: number, dark: boolean[]): Uint8Array {
  const png: number[] = []
  const chunk = (type: string, bytes: number[]) => {
    const len = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) len[i] = (bytes.length >>> (24 - i * 8)) & 0xff
    const body = [...len, ...typeToBytes(type), ...bytes]
    const crc = crc32(body)
    png.push(...body, (crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff)
  }
  png.push(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  chunk('IHDR', [0, 0, 0, size, 0, 0, 0, size, 8, 0, 0, 0, 0])
  const raw: number[] = []
  for (let y = 0; y < size; y++) {
    raw.push(0)
    for (let x = 0; x < size; x++) raw.push(dark[y * size + x] ? 0 : 255)
  }
  chunk('IDAT', deflateStored(raw))
  chunk('IEND', [])
  return Uint8Array.from(png)
}

export interface DecodedPng {
  width: number
  height: number
  gray: Uint8Array
}

export function decodePng(data: Uint8Array): DecodedPng {
  if (data.length < 8 || data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4e || data[3] !== 0x47) {
    throw new Error('not a PNG')
  }
  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idat: number[] = []
  while (pos < data.length) {
    const len = (data[pos] << 24) | (data[pos + 1] << 16) | (data[pos + 2] << 8) | data[pos + 3]
    const type = String.fromCharCode(data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7])
    const bodyStart = pos + 8
    const bodyEnd = bodyStart + len
    if (type === 'IHDR') {
      width = (data[bodyStart] << 24) | (data[bodyStart + 1] << 16) | (data[bodyStart + 2] << 8) | data[bodyStart + 3]
      height = (data[bodyStart + 4] << 24) | (data[bodyStart + 5] << 16) | (data[bodyStart + 6] << 8) | data[bodyStart + 7]
      bitDepth = data[bodyStart + 8]
      colorType = data[bodyStart + 9]
    } else if (type === 'IDAT') {
      for (let i = 0; i < len; i++) idat.push(data[bodyStart + i])
    } else if (type === 'IEND') {
      break
    }
    pos = bodyEnd + 4
  }
  if (!width || !height) throw new Error('missing IHDR')
  if (bitDepth !== 8) throw new Error('only 8-bit PNG supported')
  const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4
  const stride = width * channels
  const raw = inflate(idat)
  const out = new Uint8Array(width * height)
  let rp = 0
  const prev = new Uint8Array(stride)
  const cur = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    for (let x = 0; x < stride; x++) cur[x] = raw[rp++]
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev[x]
      const c = x >= channels ? prev[x - channels] : 0
      let v = cur[x]
      switch (filter) {
        case 1:
          v = (v + a) & 0xff
          break
        case 2:
          v = (v + b) & 0xff
          break
        case 3:
          v = (v + (((a + b) >>> 1) & 0xff)) & 0xff
          break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
          v = (v + pr) & 0xff
          break
        }
        default:
          break
      }
      cur[x] = v
    }
    prev.set(cur)
    for (let x = 0; x < width; x++) {
      if (channels === 1) out[y * width + x] = cur[x]
      else if (channels === 3) out[y * width + x] = (cur[x * 3] + cur[x * 3 + 1] + cur[x * 3 + 2]) / 3
      else if (channels === 4) out[y * width + x] = (cur[x * 4] + cur[x * 4 + 1] + cur[x * 4 + 2]) / 3
      else out[y * width + x] = cur[x * 2]
    }
  }
  return { width, height, gray: out }
}

// DEFLATE (RFC 1951): stored, fixed and dynamic Huffman blocks.
function inflate(bytes: number[]): Uint8Array {
  let bitbuf = 0
  let bitcount = 0
  // Skip the 2-byte zlib wrapper (CMF/FLG); the DEFLATE stream starts after it.
  let pos = 2
  const out: number[] = []

  const need = (n: number) => {
    while (bitcount < n) {
      if (pos >= bytes.length) throw new Error('inflate: out of data')
      bitbuf |= bytes[pos++] << bitcount
      bitcount += 8
    }
  }
  const get = (n: number): number => {
    need(n)
    const v = bitbuf & ((1 << n) - 1)
    bitbuf >>>= n
    bitcount -= n
    return v
  }
  const align = () => {
    bitbuf = 0
    bitcount = 0
  }

  interface Table {
    count: number[]
    // map from (length, rank-within-length) -> symbol id, flattened by length
    sym: number[]
  }
  // len[symbolId] = code length (0 = unused). Builds canonical Huffman tables.
  function buildTable(len: number[]): Table {
    const count = new Array(17).fill(0)
    for (const l of len) if (l > 0) count[l]++
    // For each length bucket, list the symbol ids in ascending order.
    const byLen: number[][] = []
    for (let b = 0; b <= 15; b++) byLen.push([])
    for (let s = 0; s < len.length; s++) if (len[s] > 0) byLen[len[s]].push(s)
    const sym: number[] = []
    for (let b = 1; b <= 15; b++) for (const s of byLen[b]) sym.push(s)
    return { count, sym }
  }
  function decodeSymbol(t: Table): number {
    let code = 0
    let first = 0
    let index = 0
    for (let b = 1; b <= 15; b++) {
      code = (code << 1) | get(1)
      const cnt = t.count[b]
      if (code - first < cnt) return t.sym[index + (code - first)]
      first = (first + cnt) << 1
      index += cnt
    }
    throw new Error('bad huffman symbol')
  }

  const CLCLEN = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]
  const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
  const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
  const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577, 32769, 49153]
  const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14]

  function fixedTables() {
    const llLen = new Array(288).fill(0)
    for (let i = 0; i <= 143; i++) llLen[i] = 8
    for (let i = 144; i <= 255; i++) llLen[i] = 9
    for (let i = 256; i <= 279; i++) llLen[i] = 7
    for (let i = 280; i <= 287; i++) llLen[i] = 8
    const distLen = new Array(30).fill(5)
    return { ll: buildTable(llLen), dist: buildTable(distLen) }
  }

  function readDynamic() {
    const hlit = get(5) + 257
    const hdist = get(5) + 1
    const hclen = get(4) + 4
    const clLen = new Array(19).fill(0)
    for (let i = 0; i < hclen; i++) clLen[CLCLEN[i]] = get(3)
    const cl = buildTable(clLen)
    const len = new Array(hlit + hdist).fill(0)
    let i = 0
    while (i < hlit + hdist) {
      const sym = decodeSymbol(cl)
      if (sym < 16) {
        len[i++] = sym
      } else if (sym === 16) {
        const rep = get(2) + 3
        const prev = len[i - 1]
        for (let k = 0; k < rep; k++) len[i++] = prev
      } else if (sym === 17) {
        const rep = get(3) + 3
        for (let k = 0; k < rep; k++) len[i++] = 0
      } else {
        const rep = get(7) + 11
        for (let k = 0; k < rep; k++) len[i++] = 0
      }
    }
    return { ll: buildTable(len.slice(0, hlit)), dist: buildTable(len.slice(hlit)) }
  }

  function loop(ll: Table, dist: Table) {
    for (;;) {
      const sym = decodeSymbol(ll)
      if (sym < 256) {
        out.push(sym)
      } else if (sym === 256) {
        break
      } else {
        const li = sym - 257
        let len = LBASE[li] + get(LEXT[li])
        const ds = decodeSymbol(dist)
        const off = DBASE[ds] + get(DEXT[ds])
        for (let k = 0; k < len; k++) out.push(out[out.length - off])
      }
    }
  }

  let final = false
  while (!final) {
    final = get(1) === 1
    const kind = get(2)
    if (kind === 0) {
      align()
      const len = bytes[pos] | (bytes[pos + 1] << 8)
      pos += 2
      pos += 2
      for (let i = 0; i < len; i++) out.push(bytes[pos++])
    } else if (kind === 1) {
      const { ll, dist } = fixedTables()
      loop(ll, dist)
    } else {
      const { ll, dist } = readDynamic()
      loop(ll, dist)
    }
  }
  return Uint8Array.from(out)
}
