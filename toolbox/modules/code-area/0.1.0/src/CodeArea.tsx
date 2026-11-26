// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/code-area 0.1.0: snapshot of lacuna-components CodeArea at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useRef, useState, type ReactElement, type ReactNode, type CSSProperties, type KeyboardEvent, type UIEvent, type ChangeEvent } from 'react'

export interface CodeAreaProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Number of spaces to insert for a Tab key press. Default 2. */
  tabSize?: number
  /** Maximum number of lines to render line numbers for. Default 500. */
  maxLines?: number
  /** Optional language hint for light highlighting. Default "plain". */
  language?: 'plain' | 'json' | 'js' | 'ts' | 'html' | 'css' | 'md'
  /** Whether the editor is read-only. Default false. */
  readOnly?: boolean
  /** Accessible label for the textarea. Default "Code editor". */
  ariaLabel?: string
  /** Whether to render the line-number gutter. Default true. */
  showLineNumbers?: boolean
}

type Lang = NonNullable<CodeAreaProps['language']>

const WORD_RE = /\b[a-zA-Z_$][\w$]*\b|"[^"]*"|'[^']*'|`[^`]*`|[0-9]+(\.[0-9]+)?/g

const KW: Record<Lang, ReadonlySet<string>> = {
  plain: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'class', 'type', 'interface', 'import', 'export', 'from', 'default', 'null', 'undefined', 'true', 'false']),
  json: new Set(['true', 'false', 'null']),
  js: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'typeof', 'instanceof', 'void', 'delete', 'yield', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'from', 'default', 'null', 'undefined', 'true', 'false']),
  ts: new Set(['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'super', 'this', 'typeof', 'instanceof', 'void', 'delete', 'yield', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'import', 'export', 'from', 'default', 'null', 'undefined', 'true', 'false', 'type', 'interface', 'enum', 'keyof', 'infer', 'readonly', 'never', 'unknown', 'any', 'string', 'number', 'boolean']),
  html: new Set(),
  css: new Set(),
  md: new Set(),
}

function classifyWord(word: string, lang: Lang): string | null {
  if (lang === 'json' || lang === 'js' || lang === 'ts' || lang === 'plain') {
    if (KW[lang].has(word)) return 'ca-kw'
    return null
  }
  return null
}

function highlightLine(line: string, lang: Lang, lineN: number): ReactNode[] {
  if (lang === 'plain' || lang === 'html' || lang === 'css') {
    return [
      <span key={`${lineN}:tx`} className="ca-tx">
        {line}
      </span>,
    ]
  }
  if (lang === 'md') {
    const out: ReactNode[] = []
    let i = 0
    let key = 0
    while (i < line.length) {
      const c = line[i] as string
      if (c === '#' && (i === 0 || line[i - 1] === ' ')) {
        let j = i
        while (j < line.length && line[j] === '#') j++
        const next = line[j]
        if (next === ' ' || next === undefined) {
          const hash = line.slice(i, j)
          let k = j
          while (k < line.length && line[k] === ' ') k++
          const body = line.slice(k)
          out.push(
            <span key={`${lineN}:h-${key++}`} className="ca-md-h">
              {hash}
            </span>,
          )
          out.push(
            <span key={`${lineN}:hb-${key++}`} className="ca-md-n">
              {body}
            </span>,
          )
          i = line.length
          break
        }
      }
      if (c === '*' && line[i + 1] === '*') {
        let j = i + 2
        while (j < line.length && line[j] !== '*' && line[j] !== '\n') j++
        if (line[j] === '*') {
          const body = line.slice(i + 2, j)
          out.push(
            <span key={`${lineN}:s-${key++}`} className="ca-md-s">
              **{body}*
            </span>,
          )
          out.push(
            <span key={`${lineN}:s2-${key++}`} className="ca-md-n">
              *
            </span>,
          )
          i = j + 1
          continue
        }
      }
      if (c === '`') {
        let j = i + 1
        while (j < line.length && line[j] !== '`' && line[j] !== '\n') j++
        if (line[j] === '`') {
          const body = line.slice(i + 1, j)
          out.push(
            <span key={`${lineN}:cd-${key++}`} className="ca-cd">
              `{body}`
            </span>,
          )
          i = j + 1
          continue
        }
      }
      let j = i
      while (j < line.length && !/\s/.test(line[j] as string)) j++
      out.push(
        <span key={`${lineN}:t-${key++}`} className="ca-tx">
          {line.slice(i, j)}
        </span>,
      )
      i = j
    }
    if (line.length === 0) {
      out.push(
        <span key={`${lineN}:e-${key++}`} className="ca-tx">
          {line}
        </span>,
      )
    }
    return out
  }
  const out: ReactNode[] = []
  const re = new RegExp(WORD_RE.source, 'g')
  let last = 0
  let m = re.exec(line)
  let key = 0
  while (m !== null) {
    const idx = m.index
    const tok = m[0]
    if (idx > last) {
      out.push(
        <span key={`${lineN}:tx-${key++}`} className="ca-tx">
          {line.slice(last, idx)}
        </span>,
      )
    }
    let cls: string | null = null
    if (tok === '"' || tok === "'" || tok === '`') {
      cls = 'ca-str'
    } else if (/^[0-9]+$/.test(tok)) {
      cls = 'ca-num'
    } else if (/^[a-zA-Z_$][\w$]*$/.test(tok)) {
      cls = classifyWord(tok, lang)
    }
    const keyN = `${lineN}:w-${key++}`
    if (cls === null) {
      out.push(
        <span key={keyN} className="ca-tx">
          {tok}
        </span>,
      )
    } else {
      out.push(
        <span key={keyN} className={cls}>
          {tok}
        </span>,
      )
    }
    last = idx + tok.length
    m = re.exec(line)
  }
  if (last < line.length) {
    out.push(
      <span key={`${lineN}:tail`} className="ca-tx">
        {line.slice(last)}
      </span>,
    )
  }
  if (out.length === 0) {
    out.push(
      <span key={`${lineN}:empty`} className="ca-tx">
        {line}
      </span>,
    )
  }
  return out
}

export function CodeArea(props: CodeAreaProps): ReactElement {
  const {
    value,
    defaultValue,
    onChange,
    tabSize = 2,
    maxLines = 500,
    language = 'plain',
    readOnly = false,
    ariaLabel = 'Code editor',
    showLineNumbers = true,
  } = props

  const controlled = value !== undefined
  const [internal, setInternal] = useState(defaultValue ?? '')
  const current = controlled ? (value as string) : internal
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const hlRef = useRef<HTMLDivElement | null>(null)

  const commit = (next: string): void => {
    if (!controlled) setInternal(next)
    onChange?.(next)
  }

  useEffect(() => {
    const hl = hlRef.current
    const ta = taRef.current
    if (hl === null || ta === null) return
    hl.scrollTop = ta.scrollTop
    hl.scrollLeft = ta.scrollLeft
  })

  const totalLines = Math.max(1, current.split('\n').length)
  const shown = Math.min(totalLines, maxLines)
  const gutterShown = showLineNumbers ? shown : 0

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      return
    }
    if (readOnly) return
    const ta = taRef.current
    if (ta === null) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const before = current.slice(0, start)
    const sel = current.slice(start, end)
    const after = current.slice(end)

    if (e.key === 'Tab') {
      e.preventDefault()
      const pad = ' '.repeat(tabSize)
      if (sel.includes('\n')) {
        const indented = sel
          .split('\n')
          .map((l) => pad + l)
          .join('\n')
        const next = before + indented + after
        commit(next)
        window.requestAnimationFrame(() => {
          const t = taRef.current
          if (t === null) return
          t.selectionStart = start
          t.selectionEnd = start + indented.length
        })
      } else {
        const next = before + pad + after
        commit(next)
        window.requestAnimationFrame(() => {
          const t = taRef.current
          if (t === null) return
          t.selectionStart = start + pad.length
          t.selectionEnd = start + pad.length
        })
      }
      return
    }

    if (e.key === 'Enter') {
      const lineEnd = current.indexOf('\n', start)
      const lineEndPos = lineEnd === -1 ? current.length : lineEnd
      const prevNl = before.lastIndexOf('\n')
      const lineStart = prevNl === -1 ? 0 : prevNl + 1
      const currentLine = current.slice(lineStart, lineEndPos)
      if (currentLine.endsWith('{')) {
        e.preventDefault()
        const pad = currentLine.match(/^[ \t]*/)?.[0] ?? ''
        const extra = pad + ' '.repeat(tabSize)
        const next = before + '\n' + extra + after
        commit(next)
        window.requestAnimationFrame(() => {
          const t = taRef.current
          if (t === null) return
          t.selectionStart = start + 1 + extra.length
          t.selectionEnd = start + 1 + extra.length
        })
      }
      return
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    commit(e.target.value)
  }

  const handleScroll = (e: UIEvent<HTMLTextAreaElement>): void => {
    const ta = e.currentTarget
    const hl = hlRef.current
    if (hl !== null) {
      hl.scrollTop = ta.scrollTop
      hl.scrollLeft = ta.scrollLeft
    }
  }

  const wrapStyle: CSSProperties = {
    display: 'flex',
    minHeight: 'calc(120px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(4px * var(--sf))',
    overflow: 'hidden',
    background: 'var(--paper)',
    boxSizing: 'border-box',
    fontFamily: 'var(--mono)',
    fontSize: 'calc(14px * var(--tf))',
    lineHeight: 'calc(20px * var(--tf))',
  }

  const gutterStyle: CSSProperties = {
    flexShrink: 0,
    width: 'calc(48px * var(--sf))',
    textAlign: 'right',
    padding: 'calc(4px * var(--sf)) calc(6px * var(--sf))',
    borderRight: 'calc(1px * var(--sf)) solid var(--hair)',
    background: 'var(--paper-deep)',
    color: 'var(--ink)',
    userSelect: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    pointerEvents: 'none',
  }

  const bodyStyle: CSSProperties = {
    position: 'relative',
    flex: '1 1 0%',
    minWidth: 0,
    overflow: 'hidden',
  }

  const hlStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    padding: 'calc(4px * var(--sf))',
    margin: 0,
    boxSizing: 'border-box',
    whiteSpace: 'pre',
    color: 'var(--ink)',
    background: 'transparent',
    lineHeight: 'calc(20px * var(--tf))',
    fontFamily: 'var(--mono)',
    fontSize: 'calc(14px * var(--tf))',
  }

  const taStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    border: 'none',
    outline: 'none',
    resize: 'none',
    padding: 'calc(4px * var(--sf))',
    boxSizing: 'border-box',
    fontFamily: 'var(--mono)',
    fontSize: 'calc(14px * var(--tf))',
    lineHeight: 'calc(20px * var(--tf))',
    whiteSpace: 'pre',
    overflow: 'auto',
    background: 'transparent',
    color: 'var(--ink)',
  }

  return (
    <div className="ca-wrap" style={wrapStyle}>
      {gutterShown > 0 && (
        <div className="ca-gutter" style={gutterStyle} aria-hidden="true">
          {Array.from({ length: gutterShown }, (_, i) => (
            <div key={`ln-${i + 1}`} className="ca-gutter-line">
              {i + 1}
            </div>
          ))}
        </div>
      )}
      <div className="ca-body" style={bodyStyle}>
        <div className="ca-hl" ref={hlRef} style={hlStyle} aria-hidden="true">
          {current.split('\n').slice(0, shown).map((l, i) => (
            <div key={`hl-${i}`} className="ca-hl-line">
              {highlightLine(l, language, i)}
            </div>
          ))}
        </div>
        <textarea
          ref={taRef}
          className="ca-ta"
          style={taStyle}
          value={current}
          readOnly={readOnly}
          aria-label={ariaLabel}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
        />
      </div>
    </div>
  )
}
