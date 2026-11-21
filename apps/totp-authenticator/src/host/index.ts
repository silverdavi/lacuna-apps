import { store, type Account } from './mock'

export type { Account }

export function listAccounts(): Account[] {
  return store.list()
}

export function addAccount(label: string, secret: string): Account {
  return store.add({ label, secret })
}

export function deleteAccount(id: string) {
  store.remove(id)
}

export function nextLabel(base: string, accounts: Account[]): string {
  const taken = new Set(accounts.map((a) => a.label))
  if (!taken.has(base)) return base
  let n = 1
  for (;;) {
    n += 1
    const candidate = `${base} (${n})`
    if (!taken.has(candidate)) return candidate
  }
}

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function isValidBase32(secret: string): boolean {
  if (!/^[A-Z2-7]+$/.test(secret)) return false
  // classic base32: the alphabet encodes 5 bits per char, so a valid secret
  // decodes to a whole number of bytes (length must not be 1, 3, 5, or 7 mod 8)
  return [0, 2, 4, 6, 7].includes(secret.length % 8)
}

export function normalizeSecret(input: string): string {
  return input.toUpperCase().replace(/[^A-Z2-7]/g, '')
}

export function parseOtpauth(input: string): { label: string; secret: string } | null {
  const match = input.trim().match(/^otpauth:\/\/totp\/([^?]+)\?(.*)$/i)
  if (!match) return null
  let label: string
  try {
    label = decodeURIComponent(match[1])
  } catch {
    label = match[1]
  }
  const params = new URLSearchParams(match[2])
  const secret = params.get('secret')?.toUpperCase().replace(/[^A-Z2-7]/g, '') ?? ''
  if (!secret) return null
  return { label: label || 'Account', secret }
}

function bytesToBuffer(bytes: number[]): ArrayBuffer {
  const out = new ArrayBuffer(bytes.length)
  const view = new Uint8Array(out)
  for (let i = 0; i < bytes.length; i += 1) view[i] = bytes[i]
  return out
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const bits: number[] = []
  for (const ch of secret) {
    const v = BASE32_ALPHABET.indexOf(ch)
    if (v < 0) throw new Error('bad secret')
    bits.push(...Array.from({ length: 5 }, (_, i) => (v >> (4 - i)) & 1))
  }
  while (bits.length % 8 !== 0) bits.push(0)
  const bytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j += 1) b = (b << 1) | bits[i + j]
    bytes.push(b)
  }
  const raw = bytesToBuffer(bytes)
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  return key
}

export async function totp(secret: string, now: number = Date.now(), digits = 6, period = 30): Promise<string> {
  let counter = Math.floor(now / 1000 / period)
  const key = await deriveKey(secret)
  const counterBuf = new Uint8Array(8)
  for (let i = 7; i >= 0; i -= 1) {
    counterBuf[i] = counter & 0xff
    counter >>>= 8
  }
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuf))
  const offset = sig[sig.length - 1] & 0x0f
  const code =
    (((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff)) %
    10 ** digits
  return String(code).padStart(digits, '0')
}

export function remaining(now: number = Date.now(), period = 30): number {
  return period - (Math.floor(now / 1000) % period)
}
