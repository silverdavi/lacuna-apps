// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { AppShell, Button, Card } from '@lacuna/ui'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { saveText } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'

type Tab = 'Write' | 'Preview'

function wordCount(text: string): number {
  const cleaned = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~\[\]()#>|-]/g, ' ')
    .trim()
  if (cleaned === '') return 0
  return cleaned.split(/\s+/).length
}

function toggleTaskItem(text: string, checkboxIndex: number): string {
  const lines = text.split('\n')
  let count = -1
  const next = lines.map((line) => {
    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (m === null) return line
    count += 1
    if (count !== checkboxIndex) return line
    const checked = m[1]?.toLowerCase() === 'x'
    const box = checked ? '[ ]' : '[x]'
    return line.replace(/\[([ xX])\]/, box)
  })
  return next.join('\n')
}

function withIndentedCode(source: string): string {
  const lines = source.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) break
    const indent = /^\s{4,}/.test(line)
    if (!indent) {
      out.push(line)
      i += 1
      continue
    }
    let j = i
    const block: string[] = []
    while (j < lines.length) {
      const l = lines[j]
      if (l === undefined) break
      if (!/^\s{4,}/.test(l)) break
      block.push(l.replace(/^ {4}/, ''))
      j += 1
    }
    out.push('```')
    out.push(...block)
    out.push('```')
    i = j
  }
  return out.join('\n')
}

export function App() {
  const [tab, setTab] = useState<Tab>('Write')
  const { value: text, set: setText } = useLocalRecord<string>({
    key: 'markdown-editor-document',
    version: 0,
    defaultValue: '',
  })

  const html = useMemo(() => {
    const rendered = markdownToHtml(withIndentedCode(text), { taskLists: true, tables: true })
    return rendered.replace(
      /<input type="checkbox"( checked)? disabled>/g,
      '<input type="checkbox"$1 data-taskbox>',
    )
  }, [text])
  const words = wordCount(text)

  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Undo model: a stack of "before" values. The top of the stack is the most
  // recent "before" state. On undo we pop the top and set text to it.
  //
  // For typing, we debounce: a burst of rapid keystrokes (within 200 ms)
  // counts as one action, and only the value at the start of the burst is
  // pushed to the stack. This makes Ctrl+Z after typing "# Test" revert to
  // the empty state, matching common editor expectations.
  const undoRef = useRef<string[]>([])
  const burstBeforeRef = useRef<string>('')
  const burstPendingRef = useRef(false)
  const burstTimerRef = useRef<number | null>(null)
  const lastValueRef = useRef<string>('')

  // Seed the undo stack and the "before" tracker on mount.
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    undoRef.current = [ta.value]
    burstBeforeRef.current = ta.value
    lastValueRef.current = ta.value

    const onInput = () => {
      const ta2 = textareaRef.current
      if (!ta2) return
      const current = ta2.value
      if (!burstPendingRef.current) {
        // First keystroke of a new burst: record the value before it.
        burstBeforeRef.current = lastValueRef.current
        burstPendingRef.current = true
      }
      lastValueRef.current = current
      // (Re)arm the debounce.
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
      burstTimerRef.current = window.setTimeout(() => {
        undoRef.current.push(burstBeforeRef.current)
        burstPendingRef.current = false
      }, 200)
    }
    ta.addEventListener('input', onInput)
    return () => {
      ta.removeEventListener('input', onInput)
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
    }
  }, [])

  // When text changes programmatically (task toggle, undo), record the
  // previous value so it can be undone.
  useEffect(() => {
    const prev = lastValueRef.current
    if (prev === text) return
    // If a burst is pending, commit it first so the stack stays consistent.
    if (burstPendingRef.current) {
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
      burstTimerRef.current = null
      undoRef.current.push(burstBeforeRef.current)
      burstPendingRef.current = false
    }
    undoRef.current.push(prev)
    burstBeforeRef.current = text
    lastValueRef.current = text
  }, [text])

  const commitBurst = useCallback(() => {
    if (burstPendingRef.current) {
      if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
      burstTimerRef.current = null
      undoRef.current.push(burstBeforeRef.current)
      burstPendingRef.current = false
    }
  }, [])

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement
      if (target.tagName !== 'INPUT' || target.type !== 'checkbox' || !target.hasAttribute('data-taskbox')) return
      const checkboxes = Array.from(container.querySelectorAll('input[data-taskbox]'))
      const index = checkboxes.indexOf(target)
      if (index < 0) return
      e.preventDefault()
      commitBurst()
      setText((prev) => toggleTaskItem(prev, index))
    }
    container.addEventListener('click', handler)
    return () => {
      container.removeEventListener('click', handler)
    }
  }, [setText, commitBurst])

  const onExport = useCallback(() => {
    saveText(text, { filename: 'document.md', mimeType: 'text/markdown' })
  }, [text])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      commitBurst()
      const stack = undoRef.current
      if (stack.length <= 1) return
      const prev = stack.pop()
      if (prev === undefined) return
      setText(prev)
      return
    }
    const ta = e.currentTarget
    if (e.key === 'Tab') {
      e.preventDefault()
      commitBurst()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = ta.value.slice(0, start) + '  ' + ta.value.slice(end)
      setText(next)
    }
  }, [setText, commitBurst])

  return (
    <AppShell
      name="Markdown Editor"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={`${words} words`}
      actions={
        <Button kind="ghost" onClick={onExport} style={{ color: 'var(--ink)' }}>
          Export
        </Button>
      }
    >
      <Card title="Markdown Editor">
        <div
          role="tablist"
          style={{
            display: 'flex',
            gap: 'calc(20px * var(--sf))',
            borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
            marginBottom: 'calc(16px * var(--sf))',
          }}
        >
          {(['Write', 'Preview'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', minHeight: 'calc(300px * var(--sf))' }}>
          <div
            role="tabpanel"
            aria-label="Write"
            style={{ flex: 1, display: 'block', minWidth: 0 }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Markdown editor"
              spellCheck={false}
              style={{
                width: '100%',
                height: 'calc(300px * var(--sf))',
                fontFamily: 'var(--mono)',
                fontSize: 'calc(14px * var(--tf))',
                lineHeight: 'calc(20px * var(--tf))',
                padding: 'calc(4px * var(--sf))',
                border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                borderRadius: 'calc(4px * var(--sf))',
                background: 'var(--paper)',
                color: 'var(--ink)',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div
            ref={previewRef}
            role="tabpanel"
            aria-label="Preview"
            style={{
              flex: 1,
              display: 'block',
              fontSize: 'calc(13px * var(--tf))',
              lineHeight: 1.6,
              color: 'var(--ink)',
              overflow: 'auto',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </Card>
    </AppShell>
  )
}
