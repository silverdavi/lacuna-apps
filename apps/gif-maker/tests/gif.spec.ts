import { expect, test } from '@playwright/test'
import { GIF_SIGNATURE, encodeGif } from '../src/gif'
import { decodeGif } from './gifref'

interface FakeImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

function solidFrame(width: number, height: number, r: number, g: number, b: number): FakeImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

test('encodeGif produces a decodable multi-frame GIF', () => {
  const w = 16
  const h = 8
  const bytes = encodeGif(
    [solidFrame(w, h, 220, 30, 30), solidFrame(w, h, 30, 200, 40), solidFrame(w, h, 40, 60, 230)] as unknown as ImageData[],
    200,
    w,
    h,
  )
  expect(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!)).toBe(GIF_SIGNATURE)
  expect(bytes[bytes.length - 1]).toBe(0x3b)

  const decoded = decodeGif(bytes)
  expect(decoded.width).toBe(w)
  expect(decoded.height).toBe(h)
  expect(decoded.frames.length).toBe(3)
  for (const frame of decoded.frames) {
    expect(frame.indices.length).toBe(w * h)
    expect(frame.delayCs).toBe(20)
  }
  // All frames must decode to a single consistent palette index.
  for (const frame of decoded.frames) {
    const unique = new Set<number>()
    for (let i = 0; i < frame.indices.length; i++) unique.add(frame.indices[i]!)
    expect(unique.size).toBe(1)
  }
  // Distinct input colors must map to distinct palette indices.
  const idx = decoded.frames.map((f) => f.indices[0]!)
  expect(new Set(idx).size).toBe(3)
})

test('encodeGif round-trips a varied image', () => {
  const w = 24
  const h = 10
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = (i * 7) % 256
    data[i * 4 + 1] = (i * 13) % 256
    data[i * 4 + 2] = (i * 29) % 256
    data[i * 4 + 3] = 255
  }
  const frame: FakeImageData = { data, width: w, height: h }
  const bytes = encodeGif([frame, frame] as unknown as ImageData[], 100, w, h)
  const decoded = decodeGif(bytes)
  expect(decoded.frames.length).toBe(2)
  expect(decoded.frames[0]!.indices.length).toBe(w * h)
  expect(decoded.frames[1]!.indices.length).toBe(w * h)
  // LZW must not corrupt the pixel order: first and last indices must match
  // the quantizer's deterministic output for the same input.
  expect(decoded.frames[0]!.indices[0]).toBe(decoded.frames[1]!.indices[0])
  expect(decoded.frames[0]!.indices[w * h - 1]).toBe(decoded.frames[1]!.indices[w * h - 1])
})
