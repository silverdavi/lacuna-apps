// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import type { HashAlgorithm, HashEncoding } from './host'

const encoders: { label: string; value: HashEncoding }[] = [
  { label: 'hex', value: 'hex' },
  { label: 'base64', value: 'base64' },
  { label: 'url', value: 'url' },
]

export const ALGORITHM_OPTIONS = [
  { label: 'SHA-1', value: 'SHA-1' },
  { label: 'SHA-256', value: 'SHA-256' },
  { label: 'SHA-512', value: 'SHA-512' },
]

export const ENCODING_OPTIONS = encoders

async function digest(algorithm: HashAlgorithm, input: string): Promise<ArrayBuffer> {
  return await crypto.subtle.digest(algorithm, new TextEncoder().encode(input))
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function toBase64(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary)
}

/** "url" encoding is plain hex, matching common web-tool behavior. */
export async function hashInput(algorithm: HashAlgorithm, encoding: HashEncoding, input: string): Promise<string> {
  const bytes = await digest(algorithm, input)
  if (encoding === 'base64') return toBase64(bytes)
  return toHex(bytes)
}
