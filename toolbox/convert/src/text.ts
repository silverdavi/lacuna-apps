// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { ConvertResult, Converter, PlainDocument } from './types'
import { registerConverter } from './registry'

function asText(input: unknown): string {
  if (typeof input === 'string') return input
  if (input instanceof Uint8Array) return new TextDecoder('utf-8').decode(input)
  if (input && typeof input === 'object' && 'text' in input && typeof (input as { text: unknown }).text === 'string') {
    return (input as { text: string }).text
  }
  return String(input ?? '')
}

function asDocument(input: unknown): PlainDocument {
  if (input && typeof input === 'object' && 'title' in input && 'body' in input) {
    const d = input as PlainDocument
    return { title: String(d.title ?? ''), body: String(d.body ?? '') }
  }
  return { title: 'Untitled', body: asText(input) }
}

/** Plain text → minimal document (title = first non-empty line, else Untitled). */
export const textToDocument: Converter<string | Uint8Array, PlainDocument> = {
  from: 'text',
  to: 'document',
  convert(input): ConvertResult<PlainDocument> {
    const text = asText(input).replace(/^\uFEFF/, '')
    const lines = text.split(/\r?\n/)
    const first = lines.findIndex((l) => l.trim() !== '')
    if (first < 0) {
      return { ok: true, output: { title: 'Untitled', body: '' }, warnings: [] }
    }
    const title = lines[first]!.trim()
    const rest = lines.slice(first + 1).join('\n').replace(/^\n+/, '')
    return { ok: true, output: { title, body: rest }, warnings: [] }
  },
}

/** Minimal document → plain text (`title`, blank line, `body`). */
export const documentToText: Converter<PlainDocument, string> = {
  from: 'document',
  to: 'text',
  convert(input): ConvertResult<string> {
    const doc = asDocument(input)
    const body = doc.body
    const out = body ? `${doc.title}\n\n${body}` : doc.title
    return { ok: true, output: out, warnings: [] }
  },
}

registerConverter(textToDocument)
registerConverter(documentToText)
