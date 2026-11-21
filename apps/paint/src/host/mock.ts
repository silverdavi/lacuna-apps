export interface PaintRecord {
  id: string
  pixels: string
  width: number
  height: number
  savedAt: string
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function recordFromCanvas(canvas: HTMLCanvasElement): PaintRecord {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d context')
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return {
    id: 'paint-1',
    pixels: arrayBufferToBase64(imageData.data.buffer),
    width: canvas.width,
    height: canvas.height,
    savedAt: new Date().toISOString(),
  }
}

export function applyRecordToCanvas(canvas: HTMLCanvasElement, record: PaintRecord): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const buffer = base64ToArrayBuffer(record.pixels)
  const data = new Uint8ClampedArray(buffer)
  const imageData = new ImageData(data, record.width, record.height)
  ctx.putImageData(imageData, 0, 0)
}
