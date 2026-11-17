// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Importer/exporter interface every document format module plugs into. DOCX,
// PDF, and TeX modules register here; each converts to or from DocModel.
import type { ConversionWarning, FormatId, Result } from '@lacuna/formats'
import type { DocModel } from './model'
import { sanitizeHtml, sanitizeHtmlReport } from './sanitize'

export type { ConversionWarning, FormatId, Result }

export interface ImportOptions {
  /** Used when the file does not carry a title. */
  title?: string
}

export interface DocImporter {
  format: FormatId
  /** Output html must already be sanitized. */
  import(bytes: Uint8Array, opts?: ImportOptions): Promise<Result<DocModel>>
}

export interface DocExporter {
  format: FormatId
  export(doc: DocModel): Promise<Result<Uint8Array>>
}

const importers = new Map<FormatId, DocImporter>()
const exporters = new Map<FormatId, DocExporter>()

export function registerImporter(i: DocImporter): void {
  importers.set(i.format, i)
}

export function registerExporter(e: DocExporter): void {
  exporters.set(e.format, e)
}

export function importerFor(format: FormatId): DocImporter | null {
  return importers.get(format) ?? null
}

export function exporterFor(format: FormatId): DocExporter | null {
  return exporters.get(format) ?? null
}

export function importDoc(format: FormatId, bytes: Uint8Array, opts?: ImportOptions): Promise<Result<DocModel>> {
  const i = importers.get(format)
  if (!i) return Promise.reject(new Error(`no document importer for ${format}`))
  return i.import(bytes, opts)
}

export function exportDoc(format: FormatId, doc: DocModel): Promise<Result<Uint8Array>> {
  const e = exporters.get(format)
  if (!e) return Promise.reject(new Error(`no document exporter for ${format}`))
  return e.export(doc)
}

// ---------------------------------------------------------------- html

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' }
const decodeEntities = (s: string) => s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
  return ENTITIES[e.toLowerCase()] ?? m
})
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const stripTags = (s: string) => s.replace(/<[^>]*>/g, '')

export const htmlImporter: DocImporter = {
  format: 'html',
  async import(bytes, opts) {
    const warnings: ConversionWarning[] = []
    const text = new TextDecoder('utf-8').decode(bytes)
    const titleTag = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    let body = bodyMatch ? bodyMatch[1] : text
    const h1 = body.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>/i)
    let title = titleTag ? decodeEntities(stripTags(titleTag[1])).trim() : ''
    if (h1) {
      if (!title) title = decodeEntities(stripTags(h1[1])).trim()
      body = body.slice(h1[0].length)
    }
    const { html, removed } = sanitizeHtmlReport(body.trim())
    if (removed) {
      warnings.push({ code: 'sanitized', message: 'Markup the document editor does not support was removed; the text was kept.' })
    }
    return {
      output: { schemaVersion: 1, title: title || opts?.title || 'Untitled document', html, comments: [], revisions: [] },
      warnings,
    }
  },
}

export const htmlExporter: DocExporter = {
  format: 'html',
  async export(doc) {
    const warnings: ConversionWarning[] = []
    if (doc.comments.length) warnings.push({ code: 'comments-dropped', message: `${doc.comments.length} comments are not included in the HTML file.` })
    if (doc.revisions?.length) warnings.push({ code: 'revisions-dropped', message: 'Version history is not included in the HTML file.' })
    const title = escapeHtml(doc.title)
    const html = `<!doctype html>\n<html><head><meta charset="utf-8"><title>${title}</title></head><body><h1>${title}</h1>${sanitizeHtml(doc.html)}</body></html>\n`
    return { output: new TextEncoder().encode(html), warnings }
  },
}

registerImporter(htmlImporter)
registerExporter(htmlExporter)
