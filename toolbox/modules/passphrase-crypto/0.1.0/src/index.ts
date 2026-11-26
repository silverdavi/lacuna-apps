// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/passphrase-crypto 0.1.0: snapshot of lacuna-components passphraseCrypto at d422a73 by sync-toolbox-components.py; a change gets a new version.
type Hash = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

function pick(iterations?: number, hash?: Hash): [number, Hash] {
  const i: number = iterations !== undefined ? iterations : 100000
  const h: Hash = hash !== undefined ? hash : 'SHA-256'
  return [i, h]
}

export interface EncryptedPayload {
  salt: string
  iv: string
  ciphertext: string
  iterations: number
  hash?: CryptoOptions['hash']
}

export interface CryptoOptions {
  iterations?: number
  hash?: 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'
}

const DEFAULT_ITERATIONS = 100000
const DEFAULT_HASH: CryptoOptions['hash'] = 'SHA-256'

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const c0 = bytes[i] ?? 0
    const c1 = bytes[i + 1] ?? 0
    const c2 = bytes[i + 2] ?? 0
    const pad = 3 - (bytes.length - i)
    out += B64_CHARS.charAt((c0 >> 2) & 63)
    out += B64_CHARS.charAt(((c0 & 3) << 4 | c1 >> 4) & 63)
    out += pad > 1 ? '=' : B64_CHARS.charAt(((c1 & 15) << 2 | c2 >> 6) & 63)
    out += pad >= 1 ? '=' : B64_CHARS.charAt(c2 & 63)
  }
  return out
}

function unb64(value: string): ArrayBuffer {
  const clean = value.replace(/=+$/, '')
  const bytes = new Uint8Array(((clean.length * 3) / 4) | 0)
  let j = 0
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64_CHARS.indexOf(clean.charAt(i))
    const b = B64_CHARS.indexOf(clean.charAt(i + 1))
    const c = clean.length - i > 2 ? B64_CHARS.indexOf(clean.charAt(i + 2)) : 0
    const d = clean.length - i > 3 ? B64_CHARS.indexOf(clean.charAt(i + 3)) : 0
    bytes[j++] = ((a << 2) | (b >> 4)) & 255
    if (j < bytes.length) bytes[j++] = (((b & 15) << 4) | (c >> 2)) & 255
    if (j < bytes.length) bytes[j++] = (((c & 3) << 6) | d) & 255
  }
  return bytes.buffer
}

function randomBytes(length: number): ArrayBuffer {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes.buffer.slice(0)
}

async function deriveKey(passphrase: string, salt: ArrayBuffer, iterations: number, hash: Hash): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plaintext: string, passphrase: string, options?: CryptoOptions): Promise<EncryptedPayload> {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new TypeError('plaintext must be a non-empty string')
  }
  if (typeof passphrase !== 'string' || passphrase.length === 0) {
    throw new TypeError('passphrase must be a non-empty string')
  }
  const [iterations, hash] = pick(options?.iterations, options?.hash)
  const salt = randomBytes(16)
  const iv = randomBytes(12)
  const key = await deriveKey(passphrase, salt, iterations, hash)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return {
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(ciphertext),
    iterations,
    hash: hash === DEFAULT_HASH ? undefined : hash,
  }
}

export async function decrypt(payload: EncryptedPayload, passphrase: string): Promise<string> {
  const [iterations, hash] = pick(payload.iterations, payload.hash)
  const key = await deriveKey(passphrase, unb64(payload.salt), iterations, hash)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(payload.iv) }, key, unb64(payload.ciphertext))
  return new TextDecoder().decode(plaintext)
}

export async function verifyPassphrase(payload: EncryptedPayload, passphrase: string): Promise<boolean> {
  try {
    await decrypt(payload, passphrase)
    return true
  } catch {
    return false
  }
}

export function generateSalt(length?: number): string {
  return b64(randomBytes(length ?? 16))
}

export function generateIv(length?: number): string {
  return b64(randomBytes(length ?? 12))
}
