import { expect, test } from '@playwright/test'
import { encodeQr, qrFileName, toSvgMarkup } from '../src/engine'

test('encodeQr returns a square module matrix with the version-sized dimensions', () => {
  const m = encodeQr('Hello', 'L')
  expect(m.length).toBe(21)
  for (const row of m) expect(row).toHaveLength(21)
})

test('encodeQr is deterministic and every module is 0 or 1', () => {
  const a = encodeQr('Test', 'M')
  const b = encodeQr('Test', 'M')
  expect(a).toEqual(b)
  for (const row of a) for (const cell of row) expect([0, 1]).toContain(cell)
})

test('encodeQr places the three finder patterns in the corners', () => {
  const m = encodeQr('Hello', 'L')
  const n = m.length
  const finder = (ox: number, oy: number) => {
    for (let x = 0; x < 7; x += 1) {
      for (let y = 0; y < 7; y += 1) {
        const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3))
        expect(m[oy + y][ox + x]).toBe(ring === 2 ? 0 : 1)
      }
    }
  }
  finder(0, 0)
  finder(n - 7, 0)
  finder(0, n - 7)
})

test('encodeQr draws the dark module at (8, size-8) as a 1', () => {
  const m = encodeQr('https://example.com', 'H')
  const n = m.length
  expect(m[n - 8][8]).toBe(1)
})

test('encodeQr throws when the content cannot fit in any version', () => {
  expect(() => encodeQr('x'.repeat(3000), 'H')).toThrow('content too long')
})

test('toSvgMarkup wraps the matrix in an svg with a path covering each dark module', () => {
  const m = encodeQr('Hi', 'L')
  const svg = toSvgMarkup(m)
  const dark = m.flat().filter((c) => c === 1).length
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg).toContain(`viewBox="0 0 ${m.length} ${m.length}"`)
  expect(svg.match(/M\d+ \d+h1v1h-1z/g)).toHaveLength(dark)
})

test('qrFileName slugs content and falls back to qr-code.svg for non-slug-safe input', () => {
  expect(qrFileName('Hello')).toBe('qr-hello.svg')
  expect(qrFileName('https://Example.COM/a b?c=d')).toBe('qr-https-example-com-a-b-c-d.svg')
  expect(qrFileName('!!!')).toBe('qr-code.svg')
})
