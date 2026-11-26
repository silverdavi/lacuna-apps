// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/markdown-to-html 0.1.0: snapshot of lacuna-components markdownToHtml at 6e67435 by sync-toolbox-components.py; a change gets a new version.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isSafeUrl(url: string): boolean {
  return !/^\s*(javascript|data|vbscript):/i.test(url)
}

function renderInline(text: string): string {
  let out = ''
  const re = /`([^`]+)`|\[([^\]]*)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index))
    if (m[1] !== undefined) {
      out += `<code>${escapeHtml(m[1])}</code>`
    } else if (m[2] !== undefined && m[3] !== undefined) {
      if (isSafeUrl(m[3])) {
        out += `<a href="${escapeHtml(m[3])}">${escapeHtml(m[2])}</a>`
      } else {
        out += escapeHtml(m[2])
      }
    } else if (m[4] !== undefined) {
      out += `<strong>${escapeHtml(m[4])}</strong>`
    } else if (m[5] !== undefined) {
      out += `<em>${escapeHtml(m[5])}</em>`
    }
    last = m.index + m[0].length
  }
  out += escapeHtml(text.slice(last))
  return out
}

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|/.test(line)
}

function isSeparatorRow(line: string): boolean {
  return /^\s*\|(\s*:?-{1,}:?\s*\|)+\s*$/.test(line)
}

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return t.split('|').map((c) => c.trim())
}

const DANGEROUS_TAGS = /^(?:script|iframe|object|embed|form|meta|link|style|base)$/i

function stripDangerous(tag: string): string {
  const name = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag)?.[1] ?? ''
  if (DANGEROUS_TAGS.test(name)) return ''
  let t = tag.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
  t = t.replace(/\s+(href|src|formaction|xlink:href|action)\s*=\s*(?:"(?:javascript|data)\s*:[^"]*"|'(?:javascript|data)\s*:[^']*')/gi, '')
  return t
}

export function sanitizeHtml(html: string): string {
  let out = html
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  out = out.replace(/<script\b[^>]*\/>/gi, '')
  out = out.replace(/<\/script>/gi, '')
  let prev
  while (prev !== out) {
    prev = out
    out = out.replace(/(<\/?[a-zA-Z][^>]*>)/g, (tag) => stripDangerous(tag))
  }
  return out
}

export function parseMarkdown(source: string): string {
  return markdownToHtml(source)
}

export function markdownToHtml(source: string, options?: import('./index').MarkdownToHtmlOptions): string {
  const taskLists = options?.taskLists ?? true
  const tables = options?.tables ?? true
  const lines = source.split('\n')
  const blocks: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) break

    if (line.trim() === '') {
      i += 1
      continue
    }

    if (/^\s*<script\b[^>]*>[\s\S]*?<\/script>\s*$/i.test(line)) {
      i += 1
      continue
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      const level = heading[1]?.length ?? 1
      const text = heading[2] ?? ''
      blocks.push(`<h${level}>${escapeHtml(text)}</h${level}>`)
      i += 1
      continue
    }

    if (tables && isTableLine(line) && i + 1 < lines.length) {
      const sep = lines[i + 1]
      if (sep !== undefined && isSeparatorRow(sep)) {
        const header = splitRow(line)
        let j = i + 2
        const rows: string[][] = []
        while (j < lines.length) {
          const rowLine = lines[j]
          if (rowLine === undefined || rowLine.trim() === '' || !isTableLine(rowLine)) break
          rows.push(splitRow(rowLine))
          j += 1
        }
        let table = '<table>\n<thead>\n<tr>\n'
        for (const cell of header) table += `<th>${renderInline(cell)}</th>\n`
        table += '</tr>\n</thead>\n<tbody>\n'
        if (rows.length === 0) {
          table += '<tr>\n'
          for (const cell of header) table += '<td></td>\n'
          table += '</tr>\n'
        }
        for (const row of rows) {
          table += '<tr>\n'
          for (let c = 0; c < header.length; c += 1) {
            const cell = row[c]
            table += `<td>${renderInline(cell ?? '')}</td>\n`
          }
          table += '</tr>\n'
        }
        table += '</tbody>\n</table>'
        blocks.push(table)
        i = j
        continue
      }
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        if (l === undefined) break
        const m = /^\s*[-*+]\s+(.*)$/.exec(l)
        if (m === null) break
        let content = m[1] ?? ''
        let prefix = ''
        if (taskLists) {
          const t = /^\[([ xX])\]\s+(.*)$/.exec(content)
          if (t !== null) {
            const checked = t[1]?.toLowerCase() === 'x'
            prefix = checked ? '<input type="checkbox" checked disabled> ' : '<input type="checkbox" disabled> '
            content = t[2] ?? ''
          }
        }
        items.push(`<li>${prefix}${renderInline(content)}</li>`)
        i += 1
      }
      blocks.push('<ul>\n' + items.join('\n') + '\n</ul>')
      continue
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length) {
        const l = lines[i]
        if (l === undefined) break
        const m = /^\s*\d+[.)]\s+(.*)$/.exec(l)
        if (m === null) break
        items.push(`<li>${renderInline(m[1] ?? '')}</li>`)
        i += 1
      }
      blocks.push('<ol>\n' + items.join('\n') + '\n</ol>')
      continue
    }

    const fence = /^(```|~~~)\s*(.*)$/.exec(line)
    if (fence !== null) {
      const marker = fence[1] ?? '```'
      const lang = fence[2] ?? ''
      let j = i + 1
      let code = ''
      while (j < lines.length) {
        const l = lines[j]
        if (l === undefined) break
        if (l.trim().startsWith(marker)) {
          j += 1
          break
        }
        code += (code === '' ? '' : '\n') + l
        j += 1
      }
      const cls = lang === '' ? '' : ` class="language-${escapeHtml(lang)}"`
      blocks.push(`<pre><code${cls}>${escapeHtml(code)}</code></pre>`)
      i = j
      continue
    }

    let para = ''
    while (i < lines.length) {
      const l = lines[i]
      if (l === undefined) break
      if (l.trim() === '') break
      if (/^(#{1,6})\s+/.test(l) || /^\s*[-*+]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^(```|~~~)/.test(l)) break
      para += (para === '' ? '' : ' ') + l.trim()
      i += 1
    }
    blocks.push(`<p>${renderInline(para)}</p>`)
  }

  return sanitizeHtml(blocks.join('\n'))
}
