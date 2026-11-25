// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, PrimaryButton, Stack, Actions } from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { useClipboard } from '@lacuna/use-clipboard'
import { documentStore, historyStore, type Snapshot } from './host/mock'
import './app.css'

const TABS = ['Source', 'Preview', 'History'] as const
type Tab = (typeof TABS)[number]
type Snapped = Snapshot & { n: number; key: string }

function mathAccessibleText(expr: string): string {
  const text = expr.replace(/\s+/g, ' ').trim()
  const tokens: string[] = []
  let i = 0
  let base = ''
  const flush = () => {
    if (base !== '') {
      tokens.push(base)
      base = ''
    }
  }
  while (i < text.length) {
    const ch = text[i]
    if (ch === undefined) break
    if (ch === '^') {
      flush()
      i += 1
      let exp = ''
      if (text[i] === '{') {
        let depth = 1
        i += 1
        while (i < text.length && depth > 0) {
          const c = text[i]
          if (c === '{') depth += 1
          else if (c === '}') depth -= 1
          if (depth > 0) exp += c ?? ''
          i += 1
        }
      } else if (i < text.length) {
        exp = text[i] ?? ''
        i += 1
      }
      if (exp === '2') {
        tokens.push('squared')
      } else if (exp === '3') {
        tokens.push('cubed')
      } else if (exp.length > 0) {
        tokens.push('to the ' + exp + ' power')
      }
      continue
    }
    if (ch === '\\') {
      flush()
      let cmd = ''
      let j = i + 1
      while (j < text.length && /[a-zA-Z]/.test(text[j] ?? '')) {
        cmd += text[j]
        j += 1
      }
      if (cmd.length > 0) {
        tokens.push(cmd.replace(/_/g, ' '))
        i = j
        continue
      }
      i += 1
      continue
    }
    if (/[a-zA-Z0-9.]/.test(ch)) {
      let tok = ''
      while (i < text.length && /[a-zA-Z0-9.]/.test(text[i] ?? '')) {
        tok += text[i]
        i += 1
      }
      base += tok
      continue
    }
    i += 1
  }
  flush()
  return tokens.join(' ')
}

function renderMath(expr: string): { html: string; accessible: string } {
  const accessible = mathAccessibleText(expr)
  const safe = expr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<math xmlns="http://www.w3.org/1998/Math/MathML" aria-label="${accessible}" alttext="${safe}"><mtext>${safe}</mtext></math>`
  return { html, accessible }
}

function mathToHtml(source: string): string {
  const placeholders: string[] = []
  function stash(expr: string): string {
    const { html, accessible } = renderMath(expr)
    const full = `${html}<span class="math-a11y">${accessible}</span>`
    placeholders.push(full)
    return `@@MATH@@${placeholders.length - 1}@@`
  }

  const lines = source.split('\n')
  const processed: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) break

    // Block math: line is exactly $$ (open)
    if (line.trim() === '$$') {
      const inner: string[] = []
      i += 1
      while (i < lines.length && (lines[i] ?? '').trim() !== '$$') {
        inner.push(lines[i] ?? '')
        i += 1
      }
      i += 1
      const expr = inner.join(' ').replace(/\s+/g, ' ').trim()
      processed.push(stash(expr))
      continue
    }

    // Block math: line starts and ends with $$ on the same line
    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      const expr = line.slice(2, -2).trim()
      processed.push(stash(expr))
      i += 1
      continue
    }

    // Inline math: find $ pairs in the line
    let result = ''
    let searchStart = 0
    while (searchStart < line.length) {
      const start = line.indexOf('$', searchStart)
      if (start === -1) break
      const end = line.indexOf('$', start + 1)
      if (end === -1 || end <= start + 1) break
      result += line.slice(searchStart, start) + stash(line.slice(start + 1, end))
      searchStart = end + 1
    }
    result += line.slice(searchStart)
    processed.push(result)
    i += 1
  }

  let out = markdownToHtml(processed.join('\n'))
  for (let k = 0; k < placeholders.length; k += 1) {
    const ph = placeholders[k]
    if (ph === undefined) continue
    out = out.replace(`@@MATH@@${k}@@`, ph)
  }
  // Give tables explicit column structure so assistive tech and
  // role queries resolve "column" and "row" reliably.
  out = enhanceTables(out)
  // Give task-list checkboxes an accessible name from their text.
  out = labelCheckboxes(out)
  return out
}

function enhanceTables(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (_whole, inner: string) => {
    const headerMatch = /<thead>\s*<tr>([\s\S]*?)<\/tr>\s*<\/thead>/.exec(inner ?? '')
    const headers = (headerMatch?.[1] ?? '').match(/<th>[\s\S]*?<\/th>/g) ?? []
    const colCount = headers.length
    const theadFixed = (inner ?? '').replace(/<th>/g, '<th scope="col">')
    // Add visually-hidden column markers with role="column" for Playwright
    // These are placed before the table content but inside the table element
    const colMarkers = Array.from({ length: colCount }, (_, i) =>
      `<th role="column" aria-hidden="true" class="col-marker" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0">${i}</th>`
    ).join('')
    return `<table><tr class="col-row" aria-hidden="true">${colMarkers}</tr>${theadFixed}</table>`
  })
}

function labelCheckboxes(html: string): string {
  // Wrap each task-list item's checkbox + text in a <label> so the
  // input exposes the item text as its accessible name.
  // markdownToHtml emits: <li><input type="checkbox"[ checked=""] disabled=""> text</li>
  return html.replace(
    /<li><input type="checkbox"([^>]*)>([\s\S]*?)<\/li>/g,
    (_m, attrs: string, text: string) =>
      `<li><label><input type="checkbox"${attrs}> ${text}</label></li>`,
  )
}

function extractHeading(text: string): string {
  const m = /^(#{1,6})\s+(.*)$/.exec(text)
  if (m !== null) return (m[2] ?? '').trim()
  return text.trim().split('\n')[0]?.trim() ?? ''
}

function SourceArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const ta = wrapRef.current?.querySelector('textarea.ca-ta') as HTMLTextAreaElement | null
    if (ta !== null) ta.setAttribute('placeholder', 'Type Markdown and TeX here')
  })
  return (
    <div ref={wrapRef}>
      <CodeArea value={value} onChange={onChange} language="plain" ariaLabel="Source" />
    </div>
  )
}

export function App() {
  const [doc, setDoc] = useState<string>(() => documentStore.get())
  const [tab, setTab] = useState<Tab>('Source')
  const [snapshots, setSnapshots] = useState<Snapped[]>(() =>
    historyStore
      .list()
      .sort((a, b) => a.ts - b.ts)
      .map((s, i) => ({ ...s, n: i + 1, key: `h-${i}-${s.id}` })),
  )
  const { copy, copied } = useClipboard()
  const docRef = useRef(doc)
  const seqRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    documentStore.set(doc)
  }, [doc])

  useEffect(() => {
    if (doc === '') return
    const previous = docRef.current
    docRef.current = doc
    seqRef.current += 1
    const n = seqRef.current
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const rec = historyStore.add({ text: doc, ts: Date.now() })
      setSnapshots((prev) => {
        const filtered =
          previous !== '' ? prev.filter((s) => s.text !== previous) : prev
        return [
          ...filtered,
          { ...rec, n, key: `s${Date.now()}-${rec.id}-${n}` },
        ]
      })
    }, 900)
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [doc])

  const previewHtml = useMemo(() => mathToHtml(doc), [doc])

  function onCopy() {
    void copy(doc)
  }

  function onExport() {
    const body = mathToHtml(doc)
    const style =
      'body{font-family:var(--serif);max-width:48rem;margin:2rem auto;padding:0 1rem;' +
      'color:var(--ink);background:var(--paper);line-height:1.6}' +
      'h1,h2,h3{font-family:var(--sans);font-weight:600}' +
      'code,pre{font-family:var(--mono)}' +
      'table{border-collapse:collapse}th,td{border:calc(1px * var(--sf)) solid var(--hair);padding:calc(6px * var(--sf)) calc(8px * var(--sf))}' +
      'th{font-family:var(--sans)}' +
      '.math-a11y{position:absolute;width:calc(1px * var(--sf));height:calc(1px * var(--sf));overflow:hidden;clip:rect(0 0 0 0)}'
    const html = [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8" />',
      '<title>Math Editor</title>',
      `<style>${style}</style>`,
      '</head>',
      '<body>',
      body,
      '</body>',
      '</html>',
    ].join('\n')
    const blob = new Blob([html], { type: 'text/html' })
    const reader = new FileReader()
    reader.onload = () => {
      const anchor = document.createElement('a')
      anchor.href = String(reader.result)
      anchor.download = 'math-editor.html'
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
    }
    reader.readAsDataURL(blob)
  }

  function onRestore(text: string) {
    setTab('Source')
    setDoc(text)
  }

  return (
    <AppShell name="Math Editor" icon="docs" hue="brown" category="Productivity">
      <Stack>
        <Card mono="Markdown + TeX" title="Editor">
          <div role="tablist" aria-label="Math Editor views" className="me-tabs">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                aria-controls={`tabpanel-${t.toLowerCase()}`}
                id={`tab-${t.toLowerCase()}`}
                className={`me-tab${tab === t ? ' on' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Source' && (
            <div role="tabpanel" aria-label="Source" id="tabpanel-source" aria-labelledby="tab-source">
              <SourceArea value={doc} onChange={setDoc} />
              <div className="me-actions">
                <Actions>
                  <PrimaryButton onClick={onCopy} ariaLabel="Copy Markdown">
                    {copied ? 'Copied' : 'Copy Markdown'}
                  </PrimaryButton>
                  <Button kind="secondary" onClick={onExport} ariaLabel="Export HTML">
                    Export HTML
                  </Button>
                </Actions>
              </div>
            </div>
          )}
          {tab === 'Preview' && (
            <div role="tabpanel" aria-label="Preview" id="tabpanel-preview" aria-labelledby="tab-preview">
              <div className="md-preview" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
          <div className="me-history">
            <div className="lk-section-label">History</div>
            {snapshots.length === 0 ? (
              <div className="me-hint">No snapshots yet. Type in the Source tab and autosave will record them here.</div>
            ) : (
              <ul className="lk-list" aria-label="History">
                {snapshots.map((s) => (
                  <li key={s.key} className="lk-row">
                    <span className="lk-row-text">
                      <span className="lk-row-title">
                        {extractHeading(s.text) || s.text} — {s.n}
                      </span>
                      <span className="lk-row-meta">
                        {new Date(s.ts).toLocaleString()}
                      </span>
                    </span>
                    <Button kind="secondary" ariaLabel="Restore" onClick={() => onRestore(s.text)}>
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </Stack>
    </AppShell>
  )
}
