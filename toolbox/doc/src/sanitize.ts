// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import DOMPurify from 'dompurify'

// What DocsEditor's toolbar and contentEditable produce (p, div, h2, b, i, u,
// ul, li, br), plus inline and block markup that pasted or imported text
// commonly carries. No attributes except a[href]; DOMPurify drops javascript:
// and other script-capable URLs. Disallowed wrappers are removed and their
// text kept; script, style, and similar elements are removed with contents.
export const DOC_ALLOWED_TAGS = [
  'p', 'div', 'span', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4',
  'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'code',
  'ul', 'ol', 'li', 'blockquote', 'pre',
  'a',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
]
export const DOC_ALLOWED_ATTR = ['href']

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export interface SanitizeReport {
  html: string
  /** Elements and attributes the allow-list dropped. */
  removed: number
}

export function sanitizeHtmlReport(html: string): SanitizeReport {
  if (!html) return { html: '', removed: 0 }
  // Without a DOM, DOMPurify returns its input unchanged; escape everything instead.
  if (!DOMPurify.isSupported) return { html: escapeText(html), removed: /<[a-z!/]/i.test(html) ? 1 : 0 }
  const out = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DOC_ALLOWED_TAGS,
    ALLOWED_ATTR: DOC_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  })
  // DOMPurify records the <body> it parses fragments into as removed; that is not content.
  const removed = DOMPurify.removed.filter((r) => !('element' in r && r.element.nodeName === 'BODY')).length
  return { html: out, removed }
}

/** Allow-list document HTML before it is assigned to innerHTML or rendered. */
export function sanitizeHtml(html: string): string {
  return sanitizeHtmlReport(html).html
}
