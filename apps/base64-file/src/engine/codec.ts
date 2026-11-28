// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type EncodeView = 'datauri' | 'base64' | 'css' | 'hex' | 'uint8'

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

export function base64ToBytes(raw: string): { bytes: Uint8Array; mime: string } {
  const trimmed = raw.trim()
  let mime = 'application/octet-stream'
  let payload = trimmed
  const m = trimmed.match(/^data:([^;,\s]+)?(?:;base64)?,(.*)$/s)
  if (m) {
    if (m[1]) mime = m[1]
    payload = m[2] ?? ''
  }
  const clean = payload.replace(/\s+/g, '')
  const bin = atob(clean)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return { bytes: out, mime }
}

export function formatEncoded(bytes: Uint8Array, mime: string, view: EncodeView): string {
  const b64 = bytesToBase64(bytes)
  if (view === 'base64') return b64
  if (view === 'datauri') return `data:${mime};base64,${b64}`
  if (view === 'css') return `background-image: url("data:${mime};base64,${b64}");`
  if (view === 'hex') {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ')
  }
  return `export const BYTES = new Uint8Array([${Array.from(bytes).join(', ')}]);`
}

export function extForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
    'text/html': 'html',
  }
  return map[mime] ?? 'bin'
}

export const SAMPLE_DATA_URI =
  'data:text/plain;base64,SGVsbG8gZnJvbSBMYWN1bmEgRGF0YSBVUkkgQ29udmVydGVyIQ=='
