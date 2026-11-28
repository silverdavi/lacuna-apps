// Pure image comparison on RGBA pixel arrays. A port of imgdiff.py: no DOM, no canvas.
export interface Pixels {
  data: Uint8ClampedArray
  width: number
  height: number
}

export type RGB = [number, number, number]

export interface BBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Acc {
  changed: number
  sumMag: number
  maxSum: number
  sumSq: number
  sumR: number
  sumG: number
  sumB: number
  sumA: number
  sumBv: number
  x0: number
  x1: number
  y0: number
  y1: number
}

export interface Stats {
  width: number
  height: number
  total: number
  changed: number
  changedPct: number
  meanDelta: number
  maxDelta: number
  rmse: number
  deltaR: number
  deltaG: number
  deltaB: number
  brightnessA: number
  brightnessB: number
  brightnessShift: number
  bbox: BBox | null
}

export interface DiffResult {
  /** Per pixel sum of the three channel differences, 0-765. magnitude = sum / 3. */
  sums: Uint16Array
  stats: Stats
  threshold: number
}

export const MAX_THRESHOLD = 64
export const DEFAULT_THRESHOLD = 8

export function createAccumulator(): Acc {
  return {
    changed: 0, sumMag: 0, maxSum: 0, sumSq: 0,
    sumR: 0, sumG: 0, sumB: 0, sumA: 0, sumBv: 0,
    x0: Infinity, x1: -1, y0: Infinity, y1: -1,
  }
}

/** Process rows [y0, y1). changed means mean channel delta > threshold, i.e. sum > 3 * threshold. */
export function accumulateRows(acc: Acc, a: Pixels, b: Pixels, sums: Uint16Array, threshold: number, y0: number, y1: number): void {
  const w = a.width
  const limit = threshold * 3
  const da = a.data
  const db = b.data
  let changed = 0, sumMag = 0, maxSum = acc.maxSum, sumSq = 0
  let sumR = 0, sumG = 0, sumB = 0, sumA = 0, sumBv = 0
  let bx0 = acc.x0, bx1 = acc.x1, by0 = acc.y0, by1 = acc.y1
  for (let y = y0; y < y1; y++) {
    let i = y * w * 4
    let p = y * w
    for (let x = 0; x < w; x++, i += 4, p++) {
      const ar = da[i], ag = da[i + 1], ab = da[i + 2]
      const br = db[i], bg = db[i + 1], bb = db[i + 2]
      const dr = ar > br ? ar - br : br - ar
      const dg = ag > bg ? ag - bg : bg - ag
      const dbl = ab > bb ? ab - bb : bb - ab
      const s = dr + dg + dbl
      sums[p] = s
      sumMag += s
      sumSq += dr * dr + dg * dg + dbl * dbl
      sumR += dr; sumG += dg; sumB += dbl
      sumA += ar + ag + ab
      sumBv += br + bg + bb
      if (s > maxSum) maxSum = s
      if (s > limit) {
        changed++
        if (x < bx0) bx0 = x
        if (x > bx1) bx1 = x
        if (y < by0) by0 = y
        if (y > by1) by1 = y
      }
    }
  }
  acc.changed += changed
  acc.sumMag += sumMag / 3
  acc.maxSum = maxSum
  acc.sumSq += sumSq
  acc.sumR += sumR; acc.sumG += sumG; acc.sumB += sumB
  acc.sumA += sumA; acc.sumBv += sumBv
  acc.x0 = bx0; acc.x1 = bx1; acc.y0 = by0; acc.y1 = by1
}

export function finalizeStats(acc: Acc, width: number, height: number): Stats {
  const total = width * height
  const n = total || 1
  const brightnessA = acc.sumA / (n * 3)
  const brightnessB = acc.sumBv / (n * 3)
  return {
    width, height, total,
    changed: acc.changed,
    changedPct: (100 * acc.changed) / n,
    meanDelta: acc.sumMag / n,
    maxDelta: acc.maxSum / 3,
    rmse: Math.sqrt(acc.sumSq / (n * 3)),
    deltaR: acc.sumR / n,
    deltaG: acc.sumG / n,
    deltaB: acc.sumB / n,
    brightnessA,
    brightnessB,
    brightnessShift: brightnessB - brightnessA,
    bbox: acc.x1 < 0 ? null : { x0: acc.x0, x1: acc.x1, y0: acc.y0, y1: acc.y1 },
  }
}

export function computeDiff(a: Pixels, b: Pixels, threshold: number): DiffResult {
  if (a.width !== b.width || a.height !== b.height) throw new Error('Images must be the same size')
  const sums = new Uint16Array(a.width * a.height)
  const acc = createAccumulator()
  accumulateRows(acc, a, b, sums, threshold, 0, a.height)
  return { sums, stats: finalizeStats(acc, a.width, a.height), threshold }
}

/** Linear interpolation through evenly spaced stops; t in 0-1. */
export function rampColor(stops: RGB[], t: number): RGB {
  const n = stops.length
  if (n === 1) return stops[0]
  const x = Math.min(1, Math.max(0, t)) * (n - 1)
  const i = Math.min(n - 2, Math.floor(x))
  const f = x - i
  const s = stops[i], e = stops[i + 1]
  return [s[0] + (e[0] - s[0]) * f, s[1] + (e[1] - s[1]) * f, s[2] + (e[2] - s[2]) * f]
}

/** 766 entries, one per possible channel sum, packed r,g,b. */
export function buildLut(stops: RGB[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(766 * 3)
  for (let s = 0; s <= 765; s++) {
    const c = rampColor(stops, s / 765)
    lut[s * 3] = c[0]
    lut[s * 3 + 1] = c[1]
    lut[s * 3 + 2] = c[2]
  }
  return lut
}

export function buildHeatmap(sums: Uint16Array, width: number, height: number, stops: RGB[]): Pixels {
  const lut = buildLut(stops)
  const data = new Uint8ClampedArray(width * height * 4)
  for (let p = 0, i = 0; p < sums.length; p++, i += 4) {
    const k = sums[p] * 3
    data[i] = lut[k]
    data[i + 1] = lut[k + 1]
    data[i + 2] = lut[k + 2]
    data[i + 3] = 255
  }
  return { data, width, height }
}

/** A in grayscale at reduced contrast; pixels over the threshold painted with the accent. */
export function buildOverlay(a: Pixels, sums: Uint16Array, threshold: number, accent: RGB): Pixels {
  const limit = threshold * 3
  const data = new Uint8ClampedArray(a.width * a.height * 4)
  const src = a.data
  for (let p = 0, i = 0; p < sums.length; p++, i += 4) {
    if (sums[p] > limit) {
      data[i] = accent[0]; data[i + 1] = accent[1]; data[i + 2] = accent[2]
    } else {
      const g = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]
      const v = 96 + g * 0.5
      data[i] = v; data[i + 1] = v; data[i + 2] = v
    }
    data[i + 3] = 255
  }
  return { data, width: a.width, height: a.height }
}

/** Scale factor so the longest side is at most max (1 when it already fits). */
export function fitScale(width: number, height: number, max: number): number {
  const longest = Math.max(width, height)
  return longest > max ? max / longest : 1
}

export function formatStats(s: Stats, threshold: number): string {
  const lines = [
    `Image diff ${s.width}x${s.height}, threshold ${threshold}`,
    `changed pixels : ${s.changed.toLocaleString('en-US')} / ${s.total.toLocaleString('en-US')} (${s.changedPct.toFixed(2)}%)`,
    `mean abs delta : ${s.meanDelta.toFixed(2)} / 255`,
    `max abs delta  : ${s.maxDelta.toFixed(0)} / 255`,
    `RMSE           : ${s.rmse.toFixed(2)}`,
    `per channel    : R=${s.deltaR.toFixed(2)}  G=${s.deltaG.toFixed(2)}  B=${s.deltaB.toFixed(2)}`,
    `mean brightness: A=${s.brightnessA.toFixed(1)}  B=${s.brightnessB.toFixed(1)}  (${s.brightnessShift >= 0 ? '+' : '-'}${Math.abs(s.brightnessShift).toFixed(1)})`,
  ]
  if (s.bbox) lines.push(`bounding box   : x ${s.bbox.x0}-${s.bbox.x1}, y ${s.bbox.y0}-${s.bbox.y1}`)
  else lines.push('bounding box   : none (no pixels differ above the threshold)')
  return lines.join('\n')
}
