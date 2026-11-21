import type { CorrectionLevel } from './host'

const MODULUS = 0x11d
const EC_PER_BLOCK: Record<CorrectionLevel, number[]> = {
  L: [
    7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 28, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28,
  ],
  M: [
    10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28,
  ],
  Q: [
    13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 22, 20, 24, 20, 24, 30, 24, 28, 28, 26, 28, 30, 24,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30,
  ],
  H: [
    17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
    30, 30,
  ],
}
const TOTAL_CODEWORDS: Record<CorrectionLevel, number[]> = {
  L: [
    19, 34, 55, 80, 108, 136, 156, 194, 232, 274, 324, 370, 428, 461, 523, 587, 645, 718, 792, 861,
    932, 1006, 1092, 1171, 1275, 1370, 1468, 1531, 1625, 1732, 1846, 1954, 2085, 2233, 2395, 2567,
    2749, 2953, 3169, 3389, 3624,
  ],
  M: [
    16, 28, 44, 64, 86, 108, 124, 154, 182, 216, 254, 290, 334, 365, 415, 467, 523, 581, 642, 711,
    776, 847, 919, 997, 1079, 1162, 1228, 1304, 1386, 1468, 1553, 1646, 1747, 1855, 1967, 2087,
    2210, 2338, 2473, 2614, 2761,
  ],
  Q: [
    13, 22, 34, 48, 60, 84, 98, 120, 144, 170, 198, 228, 261, 291, 331, 365, 405, 455, 507, 559,
    615, 671, 733, 793, 857, 923, 991, 1063, 1119, 1223, 1331, 1445, 1561, 1681, 1805, 1933, 2065,
    2201, 2339, 2485, 2635,
  ],
  H: [
    9, 16, 26, 36, 48, 64, 86, 108, 124, 154, 182, 216, 242, 282, 322, 354, 402, 452, 508, 568,
    634, 698, 766, 832, 902, 976, 1052, 1132, 1216, 1254, 1364, 1474, 1588, 1700, 1820, 1944, 2074,
    2204, 2336, 2472, 2612,
  ],
}
const NUM_BLOCKS: Record<CorrectionLevel, number[]> = {
  L: [1,1,1,1,1,2,2,2,2,2,4,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,12,15,16,17,18,19,19,20,21,22,24],
  M: [1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49],
  Q: [1,1,1,1,2,2,4,4,4,5,6,8,8,9,10,10,11,12,14,15,16,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,42,44,46,48],
  H: [1,1,1,1,1,2,2,4,4,4,5,6,8,8,9,10,11,13,14,16,17,18,19,20,22,24,26,28,29,31,33,35,37,38,40,43,45,47,49,51],
}
const ALIGN_POSITIONS = [
  [],
  [0, 0],
  [0, 6],
  [0, 18],
  [0, 22],
  [0, 26],
  [0, 30],
  [0, 34],
  [6, 22],
  [6, 24],
  [6, 26],
  [6, 28],
  [6, 30],
  [6, 32],
  [6, 34],
  [6, 26, 46],
  [6, 26, 48],
  [6, 26, 50],
  [6, 26, 52],
  [6, 30, 54],
  [6, 30, 56],
  [6, 30, 58],
  [6, 30, 60],
  [6, 30, 62],
  [6, 34, 64],
  [6, 28, 50, 72],
  [6, 26, 50, 74],
  [6, 30, 54, 76],
  [6, 28, 54, 78],
  [6, 32, 58, 80],
  [6, 30, 58, 82],
  [6, 34, 62, 84],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 26, 52, 76, 104],
  [6, 30, 56, 80, 108],
  [6, 34, 60, 84, 112],
  [6, 30, 58, 86, 116],
  [6, 34, 62, 90, 120],
  [6, 30, 54, 78, 102, 126],
  [6, 24, 50, 76, 102, 128],
]
const DATA_MODE: Record<string, number> = { numeric: 1, alphanumeric: 2, byte: 4, kanji: 8 }
const CHARACTER_COUNT_BITS: Record<'numeric' | 'alphanumeric' | 'byte' | 'kanji', number[]> = {
  numeric: [10, 12, 14, 14, 16, 16],
  alphanumeric: [9, 11, 13, 15, 17, 19],
  byte: [8, 16, 16, 18, 20, 24],
  kanji: [8, 10, 12, 14, 16, 18],
}

const EXP_TABLE: number[] = []
const LOG_TABLE: number[] = []
for (let i = 0; i < 512; i += 1) {
  let f = i === 0 ? 1 : EXP_TABLE[i - 1] << 1
  if (f & 0x100) f ^= 0x11d
  EXP_TABLE[i] = f & 0xff
  if (EXP_TABLE[i] > 0 && LOG_TABLE[EXP_TABLE[i]] === undefined) LOG_TABLE[EXP_TABLE[i]] = i
}

const LOG = (n: number): number => LOG_TABLE[n] ?? 0
const EXP = (n: number): number => EXP_TABLE[n % 255]

export function encodeQr(content: string, level: CorrectionLevel): number[][] {
  const bytes = new TextEncoder().encode(content)
  const version = pickVersion(level, bytes.length)
  if (!version) throw new Error('content too long')
  const versionBits = version < 7 ? [] : bits(version, 12)
  const dataBits: number[] = []
  const ccLen = version <= 9 ? 8 : version <= 26 ? 16 : 24
  dataBits.push(...bits(DATA_MODE.byte, 4), ...bits(bytes.length, ccLen), ...byteBits(bytes))
  const capacity = dataCapacity(level, version) * 8
  let pad = 0xec
  for (let i = dataBits.length; i < capacity; i += 1) {
    dataBits.push(pad)
    pad = pad === 0xec ? 0x11 : 0xec
  }
  const blocks = splitIntoBlocks(dataBits, version, level)
  const interleaved = interleaveBlocks(blocks, version, level)
  const base = buildBaseMatrix(version, level, versionBits, interleaved)
  const mask = pickMask(version, level, base)
  applyMask(mask, base, buildReserved(version))
  applyFormatInfo(base, level, mask)
  return base
}

function maskFn(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0
    case 1: return y % 2 === 0
    case 2: return x % 3 === 0
    case 3: return (x + y) % 3 === 0
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}

function isReserved(reserved: boolean[][], x: number, y: number): boolean {
  return reserved[y][x]
}

function applyMask(mask: number, grid: number[][], reserved: boolean[][]): void {
  const size = grid.length
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (isReserved(reserved, x, y)) continue
      if (maskFn(mask, x, y)) grid[y][x] ^= 1
    }
  }
}

function bitAt(grid: number[][], x: number, y: number): boolean {
  return grid[y][x] === 1
}

function penaltyScore(grid: number[][]): number {
  const size = grid.length
  let score = 0
  for (let y = 0; y < size; y += 1) {
    let runColor = grid[y][0]
    let runLen = 1
    for (let x = 1; x < size; x += 1) {
      if (grid[y][x] === runColor) runLen += 1
      else {
        if (runLen >= 5) score += 3 + (runLen - 5)
        runColor = grid[y][x]
        runLen = 1
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5)
  }
  for (let x = 0; x < size; x += 1) {
    let runColor = grid[0][x]
    let runLen = 1
    for (let y = 1; y < size; y += 1) {
      if (grid[y][x] === runColor) runLen += 1
      else {
        if (runLen >= 5) score += 3 + (runLen - 5)
        runColor = grid[y][x]
        runLen = 1
      }
    }
    if (runLen >= 5) score += 3 + (runLen - 5)
  }
  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const c = grid[y][x]
      if (c === grid[y][x + 1] && c === grid[y + 1][x] && c === grid[y + 1][x + 1]) score += 3
    }
  }
  const dark = grid.flat().filter((c) => c === 1).length
  const total = size * size
  const k = Math.floor(Math.abs(dark - total / 2) / (total / 10))
  score += k * 10
  return score
}

function pickMask(version: number, level: CorrectionLevel, base: number[][]): number {
  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask += 1) {
    const grid = base.map((row) => row.slice())
    const reserved = buildReserved(version)
    applyMask(mask, grid, reserved)
    applyFormatInfo(grid, level, mask)
    const score = penaltyScore(grid)
    if (score < bestScore) {
      bestScore = score
      best = mask
    }
  }
  return best
}

const LEVEL_BITS: Record<CorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

function applyFormatInfo(grid: number[][], level: CorrectionLevel, mask: number): void {
  const size = grid.length
  const data = (LEVEL_BITS[level] << 3) | mask
  const d = data << 10
  let rem = d
  for (let i = 14; i >= 10; i -= 1) if ((rem >>> i) & 1) rem ^= 0x537 << (i - 10)
  const full = (d | rem) ^ 0x5412
  const bit = (i: number) => ((full >>> i) & 1) === 1
  // Copy 1 (top-left): b0..b8
  // b0..b5 at (8, 0..5), b6 at (8,7), b7 at (8,8), b8 at (7,8)
  for (let i = 0; i <= 5; i += 1) grid[8][i] = bit(i) ? 1 : 0
  grid[8][7] = bit(6) ? 1 : 0
  grid[8][8] = bit(7) ? 1 : 0
  grid[7][8] = bit(8) ? 1 : 0
  // Copy 2: b0..b7 down col 8 from bottom; b8..b14 across row 8 from right
  for (let i = 0; i < 8; i += 1) grid[size - 1 - i][8] = bit(i) ? 1 : 0
  for (let i = 8; i < 15; i += 1) grid[8][size - 15 + i] = bit(i) ? 1 : 0
}

function dataCapacity(level: CorrectionLevel, version: number): number {
  const total = TOTAL_CODEWORDS[level][version - 1]
  const ec = EC_PER_BLOCK[level][version - 1]
  const blocks = NUM_BLOCKS[level][version - 1]
  return total - ec * blocks
}

function pickVersion(level: CorrectionLevel, byteCount: number): number | null {
  for (let v = 1; v <= 40; v += 1) {
    const capacity = dataCapacity(level, v)
    const cc = v <= 9 ? 8 : v <= 26 ? 16 : 24
    const needed = Math.ceil((4 + cc + byteCount * 8) / 8)
    if (needed <= capacity) return v
  }
  return null
}

function bits(value: number, count: number): number[] {
  const out: number[] = []
  for (let i = count - 1; i >= 0; i -= 1) out.push((value >> i) & 1)
  return out
}

function byteBits(bytes: Uint8Array): number[] {
  const out: number[] = []
  for (const b of bytes) out.push(...bits(b, 8))
  return out
}

function remainderPolynomial(degree: number): number[] {
  const out = new Array<number>(degree + 1).fill(0)
  out[0] = 1
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      out[j] = out[j + 1] ^ (out[j] !== 0 ? EXP(LOG(out[j]) + i) : 0)
    }
  }
  out.shift()
  return out
}

function rsDivide(dividend: number[], divisor: number[]): number[] {
  const result = dividend.slice()
  for (let i = 0; i < dividend.length - divisor.length + 1; i += 1) {
    const coef = result[i]
    if (coef === 0) continue
    for (let j = 1; j < divisor.length; j += 1) {
      result[i + j] ^= coef !== 0 ? EXP(LOG(coef) + LOG(divisor[j])) : 0
    }
  }
  const cut = dividend.length - divisor.length + 1
  return result.slice(cut)
}

function splitIntoBlocks(dataBits: number[], version: number, level: CorrectionLevel): { data: number[]; ec: number[] }[] {
  const codewords: number[] = []
  for (let i = 0; i < dataBits.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j += 1) v = (v << 1) | (dataBits[i + j] ?? 0)
    codewords.push(v)
  }
  const ecPerBlock = EC_PER_BLOCK[level][version - 1]
  const numBlocks = NUM_BLOCKS[level][version - 1]
  const totalData = dataCapacity(level, version)
  const longSize = Math.ceil(totalData / numBlocks)
  const shortSize = Math.floor(totalData / numBlocks)
  const shortCount = longSize === shortSize ? 0 : numBlocks * longSize - totalData
  const divisor = remainderPolynomial(ecPerBlock)
  const blocks: { data: number[]; ec: number[] }[] = []
  let offset = 0
  for (let i = 0; i < numBlocks; i += 1) {
    const size = i < shortCount ? shortSize : longSize
    const data = codewords.slice(offset, offset + size)
    offset += size
    const ec = rsDivide([...data, ...new Array<number>(ecPerBlock).fill(0)], divisor)
    blocks.push({ data, ec })
  }
  return blocks
}

function interleaveBlocks(blocks: { data: number[]; ec: number[] }[], version: number, level: CorrectionLevel): number[] {
  const dataLen = Math.max(...blocks.map((b) => b.data.length))
  const out: number[] = []
  for (let i = 0; i < dataLen; i += 1) {
    for (const b of blocks) {
      if (i < b.data.length) out.push(b.data[i])
    }
  }
  for (const b of blocks) {
    for (const c of b.ec) out.push(c)
  }
  return out
}

function buildReserved(version: number): boolean[][] {
  const size = version * 4 + 17
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const mark = (x: number, y: number) => {
    if (x >= 0 && x < size && y >= 0 && y < size) reserved[y][x] = true
  }
  const block = (x0: number, y0: number, x1: number, y1: number) => {
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) mark(x, y)
  }
  // Three finder + separator 9x9 blocks
  block(0, 0, 8, 8)
  block(size - 9, 0, size - 1, 8)
  block(0, size - 9, 8, size - 1)
  // Timing patterns (between finders)
  for (let i = 9; i <= size - 10; i += 1) {
    mark(6, i)
    mark(i, 6)
  }
  const alignCenters = ALIGN_POSITIONS[version - 1]
  for (const ay of alignCenters) {
    for (const ax of alignCenters) {
      if (reserved[ay]?.[ax]) continue
      block(ax - 2, ay - 2, ax + 2, ay + 2)
    }
  }
  if (version >= 7) {
    for (let i = 0; i < 12; i += 1) {
      const col = i % 3, row = Math.floor(i / 3)
      mark(col, size - 11 + row)
      mark(size - 11 + row, col)
    }
  }
  // Dark module (always dark) at (8, size-8)
  mark(8, size - 8)
  return reserved
}

function buildBaseMatrix(version: number, level: CorrectionLevel, versionBits: number[], data: number[]): number[][] {
  const size = version * 4 + 17
  const grid: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0))
  const reserved = buildReserved(version)
  const set = (x: number, y: number, dark: boolean) => {
    grid[y][x] = dark ? 1 : 0
    reserved[y][x] = true
  }
  const finder = (fx: number, fy: number) => {
    for (let x = -1; x <= 7; x += 1) {
      for (let y = -1; y <= 7; y += 1) {
        const px = fx + x, py = fy + y
        if (px < 0 || px >= size || py < 0 || py >= size) continue
        const inOuter = x >= 0 && x <= 6 && y >= 0 && y <= 6
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3))
        set(px, py, inOuter && ring !== 2)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  for (let i = 8; i <= size - 9; i += 1) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }
  const alignCenters = ALIGN_POSITIONS[version - 1]
  for (const ay of alignCenters) {
    for (const ax of alignCenters) {
      if (reserved[ay]?.[ax]) continue
      for (let x = -2; x <= 2; x += 1) {
        for (let y = -2; y <= 2; y += 1) {
          const ring = Math.max(Math.abs(x), Math.abs(y))
          set(ax + x, ay + y, ring !== 1)
        }
      }
    }
  }
  if (version >= 7) {
    for (let i = 0; i < 12; i += 1) {
      const bit = (versionBits[i] ?? 0) === 1
      const col = i % 3, row = Math.floor(i / 3)
      set(col, size - 11 + row, bit)
      set(size - 11 + row, col, bit)
    }
  }
  set(size - 8, 8, true)
  let index = 0
  let dir = -1
  let y = size - 1
  for (let x = size - 1; x > 0; x -= 2) {
    if (x === 6) x = 5
    while (true) {
      for (let dx = 0; dx <= 1; dx += 1) {
        const px = x - dx
        if (reserved[y][px]) continue
        let dark = false
        if (index < data.length) dark = ((data[index] ?? 0) & (1 << (7 - (index % 8)))) !== 0
        grid[y][px] = dark ? 1 : 0
        index += 1
      }
      y += dir
      if (y < 0 || y >= size) {
        dir = -dir
        y += dir
        break
      }
    }
  }
  return grid
}

export function toSvgMarkup(matrix: number[][]): string {
  const size = matrix.length
  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`)
  parts.push(`<path fill="rgb(0,0,0)" d="${cellPath(matrix)}"/>`)
  parts.push('</svg>')
  return parts.join('')
}

function cellPath(matrix: number[][]): string {
  const out: string[] = []
  for (let y = 0; y < matrix.length; y += 1) {
    const row = matrix[y]
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === 1) out.push(`M${x} ${y}h1v1h-1z`)
    }
  }
  return out.join('')
}

export function qrFileName(content: string): string {
  const slug = content.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `qr-${slug || 'code'}.svg`
}
