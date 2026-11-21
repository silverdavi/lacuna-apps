import type { Encoding } from './host'

// Text <-> byte helpers (browser-only, no Node Buffer).

function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function isValidUtf8(bytes: Uint8Array): boolean {
  try {
    bytesToUtf8(bytes)
    return true
  } catch {
    return false
  }
}

// Base64 via btoa/atob on a binary string.

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array | null {
  const stripped = value.replace(/[\t\n\r\f\s]/g, '')
  if (stripped.length === 0) return new Uint8Array(0)
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(stripped) || stripped.length % 4 !== 0) return null
  let binary: string
  try {
    binary = atob(stripped)
  } catch {
    return null
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Hex via manual byte mapping.

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0')
  }
  return out
}

function hexToBytes(value: string): Uint8Array | null {
  const clean = value.replace(/\s+/g, '')
  if (clean.length === 0) return new Uint8Array(0)
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(clean)) return null
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function encodeText(text: string, encoding: Encoding): string {
  if (text === '') return ''
  const bytes = utf8ToBytes(text)
  if (encoding === 'hex') return bytesToHex(bytes)
  const base = bytesToBase64(bytes)
  return encoding === 'url-base64' ? base.replace(/\+/g, '-').replace(/\//g, '_') : base
}

export function decodeText(text: string, encoding: Encoding): string | null {
  if (text.trim() === '') return null
  let bytes: Uint8Array | null
  if (encoding === 'hex') {
    bytes = hexToBytes(text)
  } else {
    const base64 =
      encoding === 'url-base64'
        ? text.replace(/-/g, '+').replace(/_/g, '/')
        : text
    bytes = base64ToBytes(base64)
  }
  if (bytes === null) return null
  if (!isValidUtf8(bytes)) return null
  return bytesToUtf8(bytes)
}

// The core conversion: if the input is valid encoded data in the selected
// encoding that decodes to valid UTF-8 text, show the decode; otherwise show
// the encode of the input.
export function convertText(input: string, encoding: Encoding): string {
  if (input === '') return ''
  const decoded = decodeText(input, encoding)
  if (decoded !== null) return decoded
  return encodeText(input, encoding)
}
