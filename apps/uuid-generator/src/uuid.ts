// Adapted from lukeed/uuid (MIT, Copyright (c) Luke Edwards <luke.edwards05@gmail.com> (lukeed.com)),
// see NOTICE.md for the full licence.

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n)
  window.crypto.getRandomValues(bytes)
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (const b of bytes) out += b.toString(16).padStart(2, '0')
  return out
}

export type UuidVersion = 'v1' | 'v4'

export type { UuidVersion as Version }

export function formatUuid(uuid: string, upper: boolean): string {
  return upper ? uuid.toUpperCase() : uuid
}

export function generateUuid(version: UuidVersion): string {
  const bytes = randomBytes(16)
  if (version === 'v1') {
    const now = Math.floor(Date.now() / 2) * 2
    const seconds = Math.floor(now / 1000) & 0x1fff_ffff
    const fraction = (now % 1000) & 0xfff

    bytes[0] = (seconds >>> 24) & 0xff
    bytes[1] = (seconds >>> 16) & 0xff
    bytes[2] = (seconds >>> 8) & 0xff
    bytes[3] = seconds & 0xff
    bytes[4] = (seconds >>> 32) & 0xff
    bytes[5] = 0x01
    bytes[6] = 0x10 | ((fraction >>> 12) & 0x0f)
    bytes[7] = 0x80 | ((fraction >>> 4) & 0x0f)
    bytes[8] = 0x80 | ((fraction & 0x0f) << 4)
    bytes[9] = 0x80 | Math.floor(Math.random() * 16)
    const hex = bytesToHex(bytes)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
