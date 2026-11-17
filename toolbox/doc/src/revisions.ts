// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { DocModel, DocRevision } from './model'

/** Legacy static paragraphs to body HTML. Paragraph text is inserted as-is. */
export function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${p}</p>`).join('')
}

export const REVISIONS_KEPT = 8

export interface RevisionMeta {
  id: string
  by: string
  /** Display time, e.g. "just now" or "Tue 15:01". */
  at: string
  label?: string
  summary?: string
}

/**
 * Set the body and snapshot it as the newest revision, keeping at most `keep`.
 * Saving the same HTML as the newest snapshot updates the body only.
 */
export function appendRevision<T extends DocModel>(doc: T, html: string, meta: RevisionMeta, keep = REVISIONS_KEPT): T {
  const revisions = doc.revisions ?? []
  if (revisions[0]?.html === html) return { ...doc, html }
  const revision: DocRevision = {
    id: meta.id,
    label: meta.label ?? 'Autosaved version',
    by: meta.by,
    at: meta.at,
    summary: meta.summary ?? 'Edited in the document',
    html,
  }
  return { ...doc, html, revisions: [revision, ...revisions].slice(0, keep) }
}
