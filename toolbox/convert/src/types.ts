// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Minimal document shape for converters that do not need @lacuna/doc.
// Kept local so this package never creates a workspace cycle with doc/formats.

export type FormatId =
  | 'text'
  | 'utf8'
  | 'document'
  | 'csv'
  | 'json'
  | 'docx'
  | 'pdf'
  | 'html'
  | 'tex'
  | 'png'
  | 'jpeg'
  | 'webp'
  | 'svg'
  | (string & {})

/** Lossy or surprising steps are reported, never silent. */
export interface ConversionWarning {
  code: string
  message: string
}

/**
 * Lightweight document object for the built-in text path and as a stand-in
 * until a converter maps into `@lacuna/doc`'s DocModel.
 */
export interface PlainDocument {
  title: string
  /** Body as plain text; paragraphs separated by blank lines. */
  body: string
}

export interface ConvertSuccess<T> {
  ok: true
  output: T
  warnings: ConversionWarning[]
}

export interface ConvertUnsupported {
  ok: false
  reason: 'unsupported'
  from: FormatId
  to: FormatId
  message: string
}

/** Malformed input for a registered pair (e.g. invalid CSV). */
export interface ConvertInvalid {
  ok: false
  reason: 'invalid'
  from: FormatId
  to: FormatId
  message: string
  code: string
}

export type ConvertResult<T = unknown> = ConvertSuccess<T> | ConvertUnsupported | ConvertInvalid

/**
 * Signature every format converter must implement when registering.
 * DOCX, PDF, HTML, and TeX modules use the same shape; only `from`/`to` and
 * the input/output types differ.
 */
export interface Converter<In = unknown, Out = unknown> {
  from: FormatId
  to: FormatId
  convert(input: In): ConvertResult<Out> | Promise<ConvertResult<Out>>
}
