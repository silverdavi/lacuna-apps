// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { ConvertResult, Converter } from './types'
import { registerConverter } from './registry'

function asText(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof Uint8Array) return new TextDecoder('utf-8').decode(input)
  if (input instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(new Uint8Array(input))
  if (input && typeof input === 'object' && 'text' in input && typeof (input as { text: unknown }).text === 'string') {
    return (input as { text: string }).text
  }
  return String(input ?? '')
}

function asBytes(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  return new TextEncoder().encode(asText(input))
}

/** Plain text → UTF-8 file bytes. */
export const textToUtf8: Converter<string | Uint8Array, Uint8Array> = {
  from: 'text',
  to: 'utf8',
  convert(input): ConvertResult<Uint8Array> {
    return { ok: true, output: new TextEncoder().encode(asText(input).replace(/^\uFEFF/, '')), warnings: [] }
  },
}

/** UTF-8 file bytes → plain text (BOM stripped). */
export const utf8ToText: Converter<Uint8Array | string, string> = {
  from: 'utf8',
  to: 'text',
  convert(input): ConvertResult<string> {
    return { ok: true, output: asText(asBytes(input)).replace(/^\uFEFF/, ''), warnings: [] }
  },
}

registerConverter(textToUtf8)
registerConverter(utf8ToText)
