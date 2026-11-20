// QR code model 2, byte mode. Encode picks the smallest version that fits
// (ECC level L). Decode reads finder patterns, format info, unmask, zigzag
// and parse the byte-mode payload. No dependencies, no network.

export interface QrMatrix {
  size: number
  // dark[x + y * size] === true
  dark: boolean[]
}

const gexp = new Array(512).fill(0)
const glog = new Array(256).fill(0)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    gexp[i] = x
    glog[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) gexp[i] = gexp[i - 255]
}
function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return gexp[(glog[a] + glog[b]) % 255]
}

function reedSolomon(data: number[], eccLen: number): number[] {
  let gen = [1]
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j]
      next[j + 1] ^= gmul(gen[j], gexp[i])
    }
    gen = next
  }
  const res = new Array(eccLen).fill(0)
  for (const b of data) {
    const fb = b ^ (res.shift() as number)
    res.push(0)
    for (let j = 0; j < eccLen; j++) res[j] ^= gmul(gen[j + 1], fb)
  }
  return res
}

// ECC L: data codewords per version 1..10, and total codewords.
const L_DATA = [19, 34, 55, 80, 108, 136, 156, 194, 232, 274]
const L_TOTAL = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346]

// data codeword capacity for ECC L, version v (1-indexed)
function capacityL(v: number): number {
  return L_DATA[v - 1]
}

export function encodeQr(text: string): QrMatrix {
  const data: number[] = []
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i) & 0xff)

  // find smallest version whose byte-mode capacity fits
  let version = 0
  for (let v = 1; v <= L_DATA.length; v++) {
    const bitsNeeded = 4 + 8 + 8 * data.length
    if (bitsNeeded <= 8 * capacityL(v)) {
      version = v
      break
    }
  }
  if (version === 0) throw new Error('text too long')

  const cap = capacityL(version)
  const bits: number[] = []
  const putBits = (v: number, n: number) => {
    for (let k = n - 1; k >= 0; k--) bits.push((v >>> k) & 1)
  }
  putBits(0b0100, 4)
  putBits(data.length, 8)
  for (const b of data) putBits(b, 8)
  const capBits = 8 * cap
  putBits(0, Math.min(4, capBits - bits.length))
  while (bits.length % 8 !== 0) bits.push(0)
  for (let pad = 0xec; bits.length < capBits; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8)
  const dataCw: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i + k]
    dataCw.push(b)
  }
  const ecc = reedSolomon(dataCw, L_TOTAL[version - 1] - cap)
  const payload = dataCw.concat(ecc)

  const size = 17 + version * 4
  const mod: boolean[] = new Array(size * size).fill(false)
  const reserved: boolean[] = new Array(size * size).fill(false)
  const set = (x: number, y: number, v: boolean, isRes = false) => {
    mod[y * size + x] = v
    if (isRes) reserved[y * size + x] = true
  }
  const isReserved = (x: number, y: number) => reserved[y * size + x]
  const finder = (ox: number, oy: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const x = ox + c
        const y = oy + r
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        if (r < 0 || r > 6 || c < 0 || c > 6) {
          set(x, y, false, true)
          continue
        }
        const dark =
          (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        set(x, y, dark, true)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0, true)
    set(i, 6, i % 2 === 0, true)
  }
  const alignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true)
      }
    }
  }
  // alignment pattern centers for versions 2..10 (only single pattern for v2)
  if (version >= 2) {
    const n = version + 1
    const step = Math.ceil((size - 13) / (n - 1))
    const centers: number[] = [6]
    for (let i = n - 2; i >= 1; i--) centers.unshift(size - 7 - i * step)
    for (const cy of centers) for (const cx of centers) {
      if ((cx === 6 && cy === 6) || (cx === size - 7 && cy === 6) || (cx === 6 && cy === size - 7)) continue
      alignment(cx, cy)
    }
  }

  const maskFns = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (y: number) => y % 2 === 0,
    (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ]
  const placeRes = (x: number, y: number, v: boolean) => {
    mod[y * size + x] = v
    reserved[y * size + x] = true
  }
  const setFmt = (f: boolean[]) => {
    placeRes(8, 0, f[0])
    placeRes(8, 1, f[1])
    placeRes(8, 2, f[2])
    placeRes(8, 3, f[3])
    placeRes(8, 4, f[4])
    placeRes(8, 5, f[5])
    placeRes(8, 7, f[6])
    placeRes(8, 8, f[7])
    placeRes(7, 8, f[7])
    placeRes(5, 8, f[6])
    placeRes(4, 8, f[5])
    placeRes(3, 8, f[4])
    placeRes(2, 8, f[3])
    placeRes(1, 8, f[2])
    placeRes(0, 8, f[1])
    placeRes(size - 8, size - 1, f[0])
    for (let i = 0; i < 7; i++) placeRes(size - 1 - i, size - 8, f[i])
  }

  let best = 0
  let bestPenalty = Infinity
  for (let m = 0; m < 8; m++) {
    const mfn = maskFns[m]
    const grid: boolean[] = []
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        grid.push(mod[y * size + x] ^ (mfn(x, y) ? 1 : 0))
      }
    }
    const pen = penalty(grid, size)
    if (pen < bestPenalty) {
      bestPenalty = pen
      best = m
    }
  }

  const stream: number[] = []
  for (const b of payload) for (let k = 7; k >= 0; k--) stream.push((b >> k) & 1)
  let p = 0
  let up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size - 1 - cnt : cnt
      for (let c = 0; c < 2; c++) {
        const x = col - c
        if (!isReserved(x, row) && p < stream.length) {
          set(x, row, stream[p] === 1)
          p++
        }
      }
    }
    up = !up
  }

  setFmt(formatBits(0, best))
  const mfn = maskFns[best]
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!reserved[y * size + x]) mod[y * size + x] = mod[y * size + x] ^ (mfn(x, y) ? 1 : 0)
    }
  }
  return { size, dark: mod }
}

function formatBits(ecc: number, mask: number): boolean[] {
  const d = ((ecc << 3) | mask) << 10
  let rem = d
  for (let i = 0; i < 10; i++) {
    rem = ((rem << 1) & 0x7ffff) ^ ((rem & 0x10000) ? 0x537 : 0)
  }
  const v = ((d << 10) | (rem & 0x3ff)) ^ 0x5412
  const out: boolean[] = []
  for (let k = 14; k >= 0; k--) out.push((v >>> k) & 1)
  return out
}

function penalty(grid: boolean[], size: number): number {
  let pen = 0
  for (let y = 0; y < size; y++) {
    let runX = 1
    let runY = 1
    for (let x = 1; x < size; x++) {
      runX = grid[y * size + x] === grid[y * size + x - 1] ? runX + 1 : 1
      if (runX === 5) pen++
      else if (runX > 5) pen++
    }
    for (let x = 1; x < size; x++) {
      runY = grid[y * size + x] === grid[(y - 1) * size + x] ? runY + 1 : 1
      if (runY === 5) pen++
      else if (runY > 5) pen++
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = grid[y * size + x]
      if (c === grid[y * size + x + 1] && c === grid[(y + 1) * size + x] && c === grid[(y + 1) * size + x + 1]) pen += 3
    }
  }
  const patternA = [true, false, true, true, true, false, true, false, false, false, false]
  const patternB = [...patternA].reverse()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 10; x++) {
      let a = true
      let b = true
      for (let k = 0; k < 11; k++) {
        const v = grid[y * size + x + k]
        if (v !== patternA[k]) a = false
        if (v !== patternB[k]) b = false
      }
      if (a) pen += 40
      if (b) pen += 40
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 10; y++) {
      let a = true
      let b = true
      for (let k = 0; k < 11; k++) {
        const v = grid[(y + k) * size + x]
        if (v !== patternA[k]) a = false
        if (v !== patternB[k]) b = false
      }
      if (a) pen += 40
      if (b) pen += 40
    }
  }
  let dark = 0
  for (let i = 0; i < grid.length; i++) if (grid[i]) dark++
  const total = grid.length
  const pct = (dark * 100) / total
  const lower = Math.floor(pct / 10) * 10
  const upper = lower + 10
  pen += (Math.min(Math.abs(pct - lower), Math.abs(upper - pct)) / 10) * 10
  return pen
}

// --- decode ---

const MASKS = [
  (x: number, y: number) => (x + y) % 2 === 0,
  (y: number) => y % 2 === 0,
  (x: number) => x % 3 === 0,
  (x: number, y: number) => (x + y) % 3 === 0,
  (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

export function decodeQr(gray: Uint8Array, width: number, height: number): string | null {
  const at = (x: number, y: number) => gray[y * width + x]
  const dark = (x: number, y: number) => at(x, y) < 128

  // find the three finder patterns (top-left, top-right, bottom-left)
  const tl = findFinder(dark, width, height, 0, 0)
  const tr = findFinder(dark, width, height, width - 7, 0)
  const bl = findFinder(dark, width, height, 0, height - 7)
  if (!tl || !tr || !bl) return null

  // tl.size is the 7x7 finder pattern width; the full code is 17 + version*4
  // modules wide, i.e. 10 modules larger than the pattern (quiet zone + format
  // info band around it).
  const size = tl.size + 10
  const version = (size - 17) / 4
  if (version < 1 || version > 10 || !Number.isInteger(version)) return null

  // build the matrix by mapping each module through bilinear sampling
  // using the three known finder centers as the reference triangle.
  const tlC = { x: tl.cx, y: tl.cy }
  const trC = { x: tr.cx, y: tr.cy }
  const blC = { x: bl.cx, y: bl.cy }
  const matrix: boolean[] = new Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      matrix[y * size + x] = sampleModule(x, y, size, tlC, trC, blC, dark, width, height)
    }
  }

  // format info: read the 15 bits from the two copies and take the one
  // with lower Hamming weight against the two candidates.
  const fmtTop: number[] = []
  for (let i = 0; i < 15; i++) {
    let bx = 8
    let by = 0
    if (i < 6) by = i
    else if (i === 6) by = 7
    else if (i === 7) by = 8
    else if (i === 8) { bx = 7; by = 8 }
    else { bx = 8 - (i - 8) - 1; by = 8 }
    fmtTop.push(matrix[by * size + bx] ? 1 : 0)
  }
  const fmtBot: number[] = []
  for (let i = 0; i < 15; i++) {
    let bx = size - 1 - i
    let by = size - 8
    if (i >= 8) { bx = size - 8; by = size - 1 - (i - 8) }
    fmtBot.push(matrix[by * size + bx] ? 1 : 0)
  }
  let mask = -1
  for (let m = 0; m < 8; m++) {
    for (let ecc = 0; ecc < 2; ecc++) {
      const bits = formatBits(ecc, m)
      let wTop = 0
      let wBot = 0
      for (let i = 0; i < 15; i++) {
        if (bits[i] !== fmtTop[i]) wTop++
        if (bits[i] !== fmtBot[i]) wBot++
      }
      if (wTop + wBot <= 4) {
        mask = m
        break
      }
    }
    if (mask !== -1) break
  }
  if (mask === -1) return null

  const mfn = MASKS[mask]
  const unmasked: boolean[] = new Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      unmasked[y * size + x] = matrix[y * size + x] ^ (mfn(x, y) ? 1 : 0)
    }
  }

  // zigzag read
  const bits: number[] = []
  let up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size - 1 - cnt : cnt
      for (let c = 0; c < 2; c++) {
        const x = col - c
        bits.push(unmasked[row * size + x] ? 1 : 0)
      }
    }
    up = !up
  }

  // parse byte mode
  let bitPos = 0
  const readBits = (n: number) => {
    let v = 0
    for (let k = 0; k < n; k++) v = (v << 1) | bits[bitPos++]
    return v
  }
  const mode = readBits(4)
  if (mode !== 0b0100) return null
  const count = readBits(8)
  const chars: number[] = []
  for (let i = 0; i < count; i++) chars.push(readBits(8))
  try {
    return new TextDecoder().decode(Uint8Array.from(chars))
  } catch {
    return String.fromCharCode(...chars)
  }
}

function findFinder(
  dark: (x: number, y: number) => boolean,
  width: number,
  height: number,
  nearX: number,
  nearY: number,
): { cx: number; cy: number; size: number } | null {
  // scan a window around the expected corner for a 7x7 finder
  const search = (x0: number, y0: number) => {
    for (let oy = -3; oy <= 3; oy++) {
      for (let ox = -3; ox <= 3; ox++) {
        const x = x0 + ox
        const y = y0 + oy
        if (x < 0 || y < 0 || x + 7 >= width || y + 7 >= height) continue
        if (looksLikeFinder(dark, x, y)) {
          return { cx: x + 3, cy: y + 3, size: 7 }
        }
      }
    }
    return null
  }
  return search(nearX, nearY)
}

function looksLikeFinder(dark: (x: number, y: number) => boolean, x: number, y: number): boolean {
  // 7x7 pattern: border ring dark, center 3x3 dark, gap ring light
  const pattern = [
    1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 1,
    1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1,
  ]
  let mismatch = 0
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const want = pattern[dy * 7 + dx]
      const got = dark(x + dx, y + dy) ? 1 : 0
      if (want !== got) mismatch++
    }
  }
  return mismatch <= 6
}

function sampleModule(
  x: number,
  y: number,
  size: number,
  tlC: { x: number; y: number },
  trC: { x: number; y: number },
  blC: { x: number; y: number },
  dark: (x: number, y: number) => boolean,
  width: number,
  height: number,
): boolean {
  // module (x,y) center in code units; map to image coordinates via affine
  // basis from the three finder centers.
  const u = x + 0.5
  const v = y + 0.5
  // tl is at module (0,0), tr at (size-1,0), bl at (0,size-1).
  const s = size - 1
  const px = tlC.x + (u / s) * (trC.x - tlC.x) + (v / s) * (blC.x - tlC.x)
  const py = tlC.y + (u / s) * (trC.y - tlC.y) + (v / s) * (blC.y - tlC.y)
  const ix = Math.round(px)
  const iy = Math.round(py)
  if (ix < 0 || iy < 0 || ix >= width || iy >= height) return false
  // sample a small neighborhood and majority vote
  let sum = 0
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const sx = ix + dx
      const sy = iy + dy
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue
      sum += dark(sx, sy) ? 1 : 0
      n++
    }
  }
  return n > 0 && sum / n >= 0.5
}
