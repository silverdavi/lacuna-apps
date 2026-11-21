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

export function generateUuid(version: UuidVersion): string {
  const bytes = randomBytes(16)
  if (version === 'v1') {
    const now = Date.now()
    const seconds = Math.floor(now / 1000) & 0x1fff_ffff
    const fraction = (now % 1000) & 0xfff
    const seq = Math.floor(Math.random() * 0x10000)
    const timeLow = seconds & 0xffffffff
    const timeMid = (seconds >>> 32) & 0xffff
    const timeHigh = ((fraction << 12) | (seq & 0xfff)) & 0x0fff
    bytes[0] = (timeLow >>> 24) & 0xff
    bytes[1] = (timeLow >>> 16) & 0xff
    bytes[2] = (timeLow >>> 8) & 0xff
    bytes[3] = timeLow & 0xff
    bytes[4] = (timeMid >>> 8) & 0xff
    bytes[5] = timeMid & 0xff
    bytes[6] = 0x10 | ((timeHigh >>> 8) & 0x0f)
    bytes[7] = timeHigh & 0xff
    bytes[8] = 0x80 | ((seq >>> 8) & 0x3f)
    bytes[9] = seq & 0xff
    // bytes[10..15] keep the random node
    const hex = bytesToHex(bytes)
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytesToHex(bytes)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
