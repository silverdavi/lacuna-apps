// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.

export type LatexMode = 'bibtex' | 'math'
export type BibTarget = 'csl-json' | 'ris' | 'markdown'
export type MathTarget = 'unicode' | 'svg'

export interface BibEntry {
  type: string
  key: string
  fields: Record<string, string>
}

export const SAMPLE_BIBTEX = `@article{shannon1948,
  author = {Claude E. Shannon},
  title = {A Mathematical Theory of Communication},
  journal = {Bell System Technical Journal},
  year = {1948},
  volume = {27},
  pages = {379--423}
}

@book{knuth1984,
  author = {Donald E. Knuth},
  title = {The TeXbook},
  publisher = {Addison-Wesley},
  year = {1984}
}`

export const SAMPLE_MATH = '\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2} \\approx 0.8862'

export function parseBibtex(raw: string): BibEntry[] {
  const entries: BibEntry[] = []
  const entryRegex = /@([a-zA-Z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)\n\s*\}/g
  let m: RegExpExecArray | null
  while ((m = entryRegex.exec(raw)) !== null) {
    const type = m[1]!.toLowerCase()
    const key = m[2]!.trim()
    const body = m[3]!
    const fields: Record<string, string> = {}
    const fieldRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)"|(\d+))/g
    let fm: RegExpExecArray | null
    while ((fm = fieldRegex.exec(body)) !== null) {
      fields[fm[1]!.toLowerCase()] = (fm[2] ?? fm[3] ?? fm[4] ?? '').replace(/\s+/g, ' ').trim()
    }
    entries.push({ type, key, fields })
  }
  return entries
}

export function exportBibtex(entries: BibEntry[], target: BibTarget): { text: string; ext: string; mime: string } {
  if (target === 'csl-json') {
    const csl = entries.map((e) => ({
      id: e.key,
      type: e.type === 'book' ? 'book' : 'article-journal',
      title: e.fields.title ?? '',
      author: (e.fields.author ?? '').split(/\s+and\s+/i).map((a) => ({ literal: a.trim() })),
      'container-title': e.fields.journal ?? e.fields.booktitle ?? undefined,
      publisher: e.fields.publisher ?? undefined,
      issued: e.fields.year ? { 'date-parts': [[Number(e.fields.year)]] } : undefined,
      page: e.fields.pages ?? undefined,
    }))
    return { text: JSON.stringify(csl, null, 2), ext: 'json', mime: 'application/json;charset=utf-8' }
  }
  if (target === 'ris') {
    const blocks = entries.map((e) => {
      const lines = [
        `TY  - ${e.type === 'book' ? 'BOOK' : 'JOUR'}`,
        `ID  - ${e.key}`,
        e.fields.author ? `AU  - ${e.fields.author}` : '',
        e.fields.title ? `TI  - ${e.fields.title}` : '',
        e.fields.journal ? `JO  - ${e.fields.journal}` : '',
        e.fields.publisher ? `PB  - ${e.fields.publisher}` : '',
        e.fields.year ? `PY  - ${e.fields.year}` : '',
        'ER  - ',
      ].filter(Boolean)
      return lines.join('\n')
    })
    return { text: blocks.join('\n\n'), ext: 'ris', mime: 'application/x-research-info-systems;charset=utf-8' }
  }
  const md = entries
    .map((e) => {
      const author = e.fields.author || 'Unknown'
      const year = e.fields.year ? ` (${e.fields.year})` : ''
      const title = e.fields.title || e.key
      const venue = e.fields.journal || e.fields.publisher || ''
      return `- ${author}${year}. *${title}*.${venue ? ` ${venue}.` : ''}`
    })
    .join('\n')
  return { text: md, ext: 'md', mime: 'text/markdown;charset=utf-8' }
}

const SYMBOLS: Array<[RegExp, string]> = [
  [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'], [/\\delta\b/g, 'δ'],
  [/\\epsilon\b/g, 'ε'], [/\\theta\b/g, 'θ'], [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'],
  [/\\pi\b/g, 'π'], [/\\sigma\b/g, 'σ'], [/\\omega\b/g, 'ω'], [/\\Delta\b/g, 'Δ'],
  [/\\Sigma\b/g, 'Σ'], [/\\Omega\b/g, 'Ω'], [/\\infty\b/g, '∞'], [/\\int(?![a-zA-Z])/g, '∫'],
  [/\\sum(?![a-zA-Z])/g, '∑'], [/\\prod(?![a-zA-Z])/g, '∏'], [/\\sqrt\{([^}]+)\}/g, '√($1)'],
  [/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)'], [/\\approx\b/g, '≈'],
  [/\\neq\b/g, '≠'], [/\\leq\b/g, '≤'], [/\\geq\b/g, '≥'], [/\\pm\b/g, '±'],
  [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\to\b/g, '→'],
]

export function latexMathToUnicode(raw: string): string {
  let out = raw.trim()
  for (const [re, rep] of SYMBOLS) out = out.replace(re, rep)
  out = out.replace(/\^\{([^}]+)\}/g, '^($1)').replace(/_\{([^}]+)\}/g, '_($1)')
  return out
}

export function latexMathToSvg(raw: string): string {
  const unicode = latexMathToUnicode(raw)
  const escaped = unicode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const width = Math.max(240, unicode.length * 14 + 48)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="72" viewBox="0 0 ${width} 72"><rect width="${width}" height="72" fill="rgb(250, 249, 245)" stroke="rgb(200, 196, 188)" /><text x="24" y="44" font-family="serif" font-size="22" fill="rgb(28, 28, 30)">${escaped}</text></svg>`
}
