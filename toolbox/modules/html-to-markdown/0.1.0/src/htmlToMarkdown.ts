// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/html-to-markdown 0.1.0: snapshot of lacuna-components htmlToMarkdown at d422a73 by sync-toolbox-components.py; a change gets a new version.
import type { HtmlToMarkdownOptions } from './index'

type Opts = Required<HtmlToMarkdownOptions>

const VOID_TAGS = new Set(['br', 'img', 'input', 'wbr', 'hr'])

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'math', 'iframe', 'object', 'embed'])

const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const INLINE_TAGS = new Set(['a', 'b', 'code', 'dfn', 'del', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'])

const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'details', 'dialog',
  'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'header',
  'li', 'main', 'nav', 'ol', 'option',
  'p', 'pre', 'section', 'summary', 'table', 'tr', 'ul', 'video',
])

const TAG_RE = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)((?:[^'">]|"[^"]*"|'[^']*')*?)\s*(\/?)>/g

function readAttrs(chunk: string): Map<string, string> {
  const attrs = new Map<string, string>()
  const re = /([a-zA-Z_:][a-zA-Z0-9_.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chunk)) !== null) {
    const name = m[1]!.toLowerCase()
    const val = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]
    if (val !== undefined && !attrs.has(name)) attrs.set(name, val)
  }
  return attrs
}

const HREF_RE = /\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)/i

function getHref(chunk: string): string {
  const m = HREF_RE.exec(chunk)
  if (m === null) return ''
  const raw = m[1]!.replace(/^["']|["']$/g, '')
  return safeUrl(raw)
}

function safeUrl(url: string): string {
  const t = url.trim()
  if (/^(javascript|vbscript|data|file|blob):/i.test(t)) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !/^https?:/i.test(t)) return ''
  return t
}

function sanitize(html: string): string {
  let out = html.replace(/<!--[\s\S]*?-->/g, '')
  for (let guard = 0; guard < 3; guard++) {
    const next = out.replace(
      /<\s*(?:script|style|noscript|template|svg|math|iframe|object|embed)\b[^>]*>[\s\S]*?(?:<\/\s*(?:script|style|noscript|template|svg|math|iframe|object|embed)\s*>|$)/gi,
      '',
    )
    if (next === out) break
    out = next
  }
  out = out.replace(/<\s*(?:script|style|noscript|template|svg|math|iframe|object|embed)\b[^>]*\/>/gi, '')
  return out
}

function openMarker(tag: string, opts: Opts): string {
  if (tag === 'strong' || tag === 'b') return '**'
  if (tag === 'em' || tag === 'i') return '*'
  if (tag === 'code') return opts.inlineCode ? '`' : ''
  if (tag === 'del' || tag === 's') return '~~'
  return ''
}

function closeMarker(tag: string, opts: Opts): string {
  if (tag === 'strong' || tag === 'b') return '**'
  if (tag === 'em' || tag === 'i') return '*'
  if (tag === 'code') return opts.inlineCode ? '`' : ''
  if (tag === 'del' || tag === 's') return '~~'
  return ''
}

interface State {
  lines: string[]
  cur: string
  inList: boolean
  listStack: { ordered: boolean }[]
  inPre: boolean
  inTable: boolean
  pendingAnchorHref: string | null
  opts: Opts
}

function flushLi(st: State): void {
  const t = st.cur.replace(/ +/g, ' ').trimEnd()
  if (t !== '') st.lines.push(t)
  st.cur = ''
  st.inList = false
}

function pushBlank(st: State): void {
  st.lines.push('')
}

function handleOpen(st: State, tag: string, chunk: string): void {
  if (HEADINGS.has(tag)) {
    flushLi(st)
    st.cur = '#'.repeat(Number(tag.slice(1))) + ' '
    return
  }
  if (tag === 'ul' || tag === 'ol') {
    st.listStack.push({ ordered: tag === 'ol' })
    return
  }

  if (tag === 'li') {
    flushLi(st)
    const o = st.listStack[st.listStack.length - 1]?.ordered ?? false
    st.listStack.push({ ordered: o })
    const depth = Math.min(st.listStack.length - 2, st.opts.maxListDepth)
    const indent = '  '.repeat(Math.max(0, depth))
    st.cur = indent + (o ? '1. ' : '- ')
    st.inList = true
    return
  }
  if (tag === 'pre') {
    flushLi(st)
    st.inPre = true
    st.cur = '```\n'
    return
  }
  if (tag === 'table') {
    flushLi(st)
    st.inTable = true
    st.cur = '|'
    return
  }
  if (tag === 'tr') {
    st.cur += '|'
    return
  }
  if (tag === 'th' || tag === 'td') {
    st.cur += ' '
    return
  }
  if (INLINE_TAGS.has(tag)) {
    if (tag === 'a') {
      const href = getHref(chunk)
      if (href !== '') {
        st.cur += '['
        st.pendingAnchorHref = href
      }
    } else {
      st.cur += openMarker(tag, st.opts)
    }
    return
  }
  if (BLOCK_TAGS.has(tag)) {
    flushLi(st)
    st.cur = ''
  }
}

function handleClose(st: State, tag: string, chunk: string): void {
  if (tag === 'li') {
    flushLi(st)
    st.listStack.pop()
    if (st.listStack.length === 0) st.lines.push('')
    return
  }

  if (HEADINGS.has(tag)) {
    flushLi(st)
    st.cur = ''
    return
  }
  if (tag === 'pre') {
    st.cur += '\n```'
    st.inPre = false
    flushLi(st)
    return
  }
  if (tag === 'table') {
    st.inTable = false
    flushLi(st)
    return
  }
  if (tag === 'tr') {
    st.cur += '|\n'
    return
  }
  if (tag === 'th' || tag === 'td') {
    st.cur += ' |'
    return
  }
  if (INLINE_TAGS.has(tag)) {
    if (tag === 'a') {
      if (st.pendingAnchorHref !== null) {
        st.cur += `](${st.pendingAnchorHref})`
        st.pendingAnchorHref = null
      }
    } else {
      st.cur += closeMarker(tag, st.opts)
    }
    return
  }
  if (BLOCK_TAGS.has(tag)) {
    flushLi(st)
    st.cur = ''
  }
}

function handleVoid(st: State, tag: string, attrs: Map<string, string>): void {
  if (tag === 'br') {
    if (st.inList) {
      st.cur += '\n'
    } else {
      st.cur += '\n'
    }
    return
  }
  if (tag === 'img') {
    const src = safeUrl(attrs.get('src') ?? '')
    if (src !== '' && st.opts.images) st.cur += `![](${src})`
    return
  }
  if (tag === 'hr') {
    flushLi(st)
    st.lines.push('* * *')
  }
}

export function htmlToMarkdown(html: string, options?: HtmlToMarkdownOptions): string {
  const opts: Opts = {
    maxListDepth: options?.maxListDepth ?? 8,
    inlineCode: options?.inlineCode ?? true,
    images: options?.images ?? true,
  }
  if (html === '') return ''

  const st: State = {
    lines: [],
    cur: '',
    inList: false,
    listStack: [],
    inPre: false,
    inTable: false,
    pendingAnchorHref: null,
    opts,
  }

  const src = sanitize(html)
  TAG_RE.lastIndex = 0
  let pos = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(src)) !== null) {
    const full = m[0]!
    const close = m[1] === '/'
    const rawTag = m[2] ?? ''
    const chunk = m[3] ?? ''
    const selfClose = m[4] === '/'
    const tag = rawTag.toLowerCase()

    const idx = m.index
    const text = src.slice(pos, idx)
    pos = idx + full.length

    st.cur += text
    if (SKIP_TAGS.has(tag)) continue
    if (VOID_TAGS.has(tag) || selfClose) {
      handleVoid(st, tag, readAttrs(chunk))
      continue
    }
    if (close) handleClose(st, tag, chunk)
    else handleOpen(st, tag, chunk)
  }
  st.cur += src.slice(pos)
  flushLi(st)
  if (st.pendingAnchorHref !== null) {
    st.pendingAnchorHref = null
  }
  while (st.listStack.length > 0) st.listStack.pop()

  const raw = st.lines.join('\n')
  let md = raw.replace(/\n{3,}/g, '\n\n')
  md = md.replace(/\n+$/, '')
  if (md !== '') md += '\n'
  else if (html !== '') md = '\n'
  return md
}
