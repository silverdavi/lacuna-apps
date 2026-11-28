import test from 'node:test'
import assert from 'node:assert/strict'
import { buildHeatmap, buildOverlay, computeDiff, fitScale, formatStats, rampColor, type Pixels, type RGB } from './diff.ts'

function img(w: number, h: number, px: number[][]): Pixels {
  const data = new Uint8ClampedArray(w * h * 4)
  px.forEach((p, i) => data.set([p[0], p[1], p[2], 255], i * 4))
  return { data, width: w, height: h }
}
const fill = (w: number, h: number, c: number[]) => img(w, h, Array.from({ length: w * h }, () => c))

test('identical images have no changed pixels and no bounding box', () => {
  const a = fill(3, 2, [10, 20, 30])
  const r = computeDiff(a, fill(3, 2, [10, 20, 30]), 8)
  assert.equal(r.stats.changed, 0)
  assert.equal(r.stats.changedPct, 0)
  assert.equal(r.stats.maxDelta, 0)
  assert.equal(r.stats.rmse, 0)
  assert.equal(r.stats.bbox, null)
})

test('one differing pixel gives exact stats and bounding box', () => {
  const a = fill(2, 2, [0, 0, 0])
  const b = fill(2, 2, [0, 0, 0])
  b.data.set([30, 60, 90, 255], (1 * 2 + 1) * 4) // x=1, y=1
  const { stats, sums } = computeDiff(a, b, 8)
  assert.equal(sums[3], 180)
  assert.equal(stats.changed, 1)
  assert.equal(stats.changedPct, 25)
  assert.equal(stats.maxDelta, 60)
  assert.equal(stats.meanDelta, 15)
  assert.deepEqual(stats.bbox, { x0: 1, x1: 1, y0: 1, y1: 1 })
  assert.equal(stats.deltaR, 7.5)
  assert.equal(stats.deltaG, 15)
  assert.equal(stats.deltaB, 22.5)
  assert.equal(stats.brightnessA, 0)
  assert.equal(stats.brightnessB, 15)
  assert.equal(stats.brightnessShift, 15)
  assert.ok(Math.abs(stats.rmse - Math.sqrt((900 + 3600 + 8100) / 12)) < 1e-9)
})

test('threshold is strict: mean delta equal to the threshold is not changed', () => {
  const a = fill(1, 1, [0, 0, 0])
  const b = fill(1, 1, [8, 8, 8])
  assert.equal(computeDiff(a, b, 8).stats.changed, 0)
  assert.equal(computeDiff(a, b, 7).stats.changed, 1)
})

test('a darker B gives a negative brightness shift', () => {
  const r = computeDiff(fill(2, 1, [100, 100, 100]), fill(2, 1, [90, 90, 90]), 0)
  assert.equal(r.stats.brightnessShift, -10)
  assert.equal(r.stats.changed, 2)
})

test('size mismatch throws', () => {
  assert.throws(() => computeDiff(fill(1, 1, [0, 0, 0]), fill(2, 1, [0, 0, 0]), 8))
})

test('ramp interpolates linearly between stops and clamps', () => {
  const stops: RGB[] = [[0, 0, 0], [100, 0, 0], [100, 200, 0]]
  assert.deepEqual(rampColor(stops, 0), [0, 0, 0])
  assert.deepEqual(rampColor(stops, 0.25), [50, 0, 0])
  assert.deepEqual(rampColor(stops, 0.75), [100, 100, 0])
  assert.deepEqual(rampColor(stops, 2), [100, 200, 0])
  assert.deepEqual(rampColor(stops, -1), [0, 0, 0])
})

test('heatmap maps zero to the first stop and full difference to the last', () => {
  const stops: RGB[] = [[1, 2, 3], [250, 240, 230]]
  const r = computeDiff(fill(2, 1, [0, 0, 0]), img(2, 1, [[0, 0, 0], [255, 255, 255]]), 8)
  const h = buildHeatmap(r.sums, 2, 1, stops)
  assert.deepEqual(Array.from(h.data.slice(0, 4)), [1, 2, 3, 255])
  assert.deepEqual(Array.from(h.data.slice(4, 8)), [250, 240, 230, 255])
})

test('overlay paints changed pixels with the accent and greys the rest', () => {
  const a = img(2, 1, [[200, 0, 0], [200, 0, 0]])
  const b = img(2, 1, [[200, 0, 0], [0, 0, 0]])
  const r = computeDiff(a, b, 8)
  const o = buildOverlay(a, r.sums, 8, [9, 8, 7])
  assert.equal(o.data[0], o.data[1])
  assert.equal(o.data[1], o.data[2])
  assert.deepEqual(Array.from(o.data.slice(4, 8)), [9, 8, 7, 255])
})

test('fitScale and formatStats', () => {
  assert.equal(fitScale(4000, 100, 4096), 1)
  assert.equal(fitScale(8192, 4096, 4096), 0.5)
  const a = fill(2, 2, [0, 0, 0])
  const text = formatStats(computeDiff(a, a, 8).stats, 8)
  assert.match(text, /0\.00%/)
  assert.match(text, /bounding box   : none/)
})
