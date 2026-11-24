// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import {
  Actions,
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Keys,
  Rail,
  Stack,
  Tag,
} from '@lacuna/ui'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { saveText } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'

type Tab = 'Write' | 'Preview'

interface Tool {
  key: string
  label: string
  hint: string
}

const TOOLS: Tool[] = [
  { key: 'bold', label: 'B', hint: 'Bold' },
  { key: 'italic', label: 'I', hint: 'Italic' },
  { key: 'code', label: '`', hint: 'Inline code' },
  { key: 'list', label: '•', hint: 'Bulleted list' },
  { key: 'task', label: '✓', hint: 'Task list' },
  { key: 'table', label: 'T', hint: 'Table' },
]

function wordCount(text: string): number {
  const cleaned = text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_`~\[\]()#>|-]/g, ' ')
    .trim()
  if (cleaned === '') return 0
  return cleaned.split(/\s+/).length
}

function charCount(text: string): number {
  return text.length
}

function lineCount(text: string): number {
  return text === '' ? 0 : text.split('\n').length
}

function taskCount(text: string): number {
  return (text.match(/(?:^|\n)\s*[-*+]\s+\[[ xX]\]/g) ?? []).length
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
    if (!/^\s{4,}/.test(line)) {
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

function applyTool(text: string, ta: HTMLTextAreaElement, tool: string): string {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const sel = text.slice(start, end)
  const before = text.slice(0, start)
  const after = text.slice(end)
  let next: string
  let cursor: number

  switch (tool) {
    case 'bold':
      next = before + '**' + sel + '**' + after
      cursor = start + sel.length + 4
      break
    case 'italic':
      next = before + '*' + sel + '*' + after
      cursor = start + sel.length + 2
      break
    case 'code':
      next = before + '`' + sel + '`' + after
      cursor = start + sel.length + 2
      break
    case 'list':
      next = before + sel.split('\n').map((l) => '- ' + l).join('\n') + after
      cursor = start + next.slice(start).length
      break
    case 'task':
      next = before + sel.split('\n').map((l) => '- [ ] ' + l).join('\n') + after
      cursor = start + next.slice(start).length
      break
    case 'table':
      next = before + '| Column A | Column B |\n|---|---|\n| cell | cell |' + (after === '' ? '' : '\n' + after)
      cursor = start + next.slice(start).length
      break
    default:
      next = text
      cursor = start
  }
  window.requestAnimationFrame(() => {
    try {
      ta.selectionStart = cursor
      ta.selectionEnd = cursor
    } catch {
      // Element detached mid-animation.
    }
  })
  return next
}

function TabBar({ items, active, onSelect }: { items: string[]; active: string; onSelect: (value: string) => void }) {
  return (
    <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 'calc(20px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)' }}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={item === active}
          onClick={() => onSelect(item)}
          style={{
            fontSize: 'calc(12.5px * var(--tf))', fontWeight: 600,
            color: item === active ? 'var(--ink)' : 'var(--ink-80)',
            padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
            cursor: 'pointer', border: 'none', background: 'none',
            borderBottom: 'calc(2px * var(--sf)) solid ' + (item === active ? 'var(--accent)' : 'transparent'),
            fontFamily: 'var(--sans)',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

function statusLine(words: number, tasks: number, state: string): string {
  const parts: string[] = []
  if (tasks > 0) parts.push(`${tasks} task${tasks === 1 ? '' : 's'}`)
  parts.push(state)
  return parts.join(' · ')
}

export function App() {
  const [tab, setTab] = useState<Tab>('Write')
  const [activeTool, setActiveTool] = useState('')
  const [exported, setExported] = useState(false)
  const { value: text, set: setText } = useLocalRecord<string>({
    key: 'markdown-editor-document',
    version: 0,
    defaultValue: '',
  })

  const words = wordCount(text)
  const chars = charCount(text)
  const lines = lineCount(text)
  const tasks = taskCount(text)
  const isEmpty = text.trim() === ''

  const html = useMemo(() => {
    const rendered = markdownToHtml(withIndentedCode(text), { taskLists: true, tables: true })
    return rendered.replace(
      /<input type="checkbox"( checked)? disabled>/g,
      '<input type="checkbox"$1 data-taskbox>',
    )
  }, [text])

  const previewRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const onExport = useCallback(() => {
    saveText(text, { filename: 'document.md', mimeType: 'text/markdown' })
    setExported(true)
    window.setTimeout(() => setExported(false), 2400)
  }, [text])

  const undoRef = useRef<string[]>([''])
  const burstStartRef = useRef('')
  const lastCommittedRef = useRef('')
  const burstActiveRef = useRef(false)
  const burstTimerRef = useRef<number | null>(null)

  const closeBurst = useCallback(() => {
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current)
      burstTimerRef.current = null
    }
    if (!burstActiveRef.current) return
    undoRef.current.push(burstStartRef.current)
    burstActiveRef.current = false
    lastCommittedRef.current = text
  }, [text])

  const onEditorChange = useCallback((next: string) => {
    if (!burstActiveRef.current) {
      burstStartRef.current = text
      burstActiveRef.current = true
    }
    setText(next)
    if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(() => closeBurst(), 200)
  }, [text, setText, closeBurst])

  useEffect(() => () => {
    if (burstTimerRef.current !== null) window.clearTimeout(burstTimerRef.current)
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
      closeBurst()
      setText((prev) => toggleTaskItem(prev, index))
    }
    container.addEventListener('click', handler)
    return () => {
      container.removeEventListener('click', handler)
    }
  }, [tab, setText, closeBurst])

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onExport()
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [onExport])

  const onToolbar = useCallback((tool: string) => {
    const ta = editorRef.current
    if (!ta) return
    closeBurst()
    const next = applyTool(text, ta, tool)
    setText(next)
    setActiveTool(tool)
  }, [text, setText, closeBurst])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      closeBurst()
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
      closeBurst()
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = ta.value.slice(0, start) + '  ' + ta.value.slice(end)
      setText(next)
    }
  }, [setText, closeBurst])

  const railNote = isEmpty ? 'Ready' : 'Edited'
  const chips = isEmpty ? ['Markdown', 'Document.md', 'Live preview'] : [`${lines} lines`, `${chars} chars`, `${tasks} task${tasks === 1 ? '' : 's'}`]

  return (
    <AppShell
      name="Markdown Editor"
      icon="docs"
      hue="blue"
      category="Writing"
      meta={`${words} words`}
      status={statusLine(words, tasks, exported ? 'Exported' : isEmpty ? 'Ready' : 'Edited')}
      side={
        <Rail title="Document" note={railNote} chips={chips}>
          <Stack lg>
            <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: '1fr', gap: 'calc(20px * var(--sf))', paddingTop: 'calc(14px * var(--sf))', borderTop: 'calc(1px * var(--sf)) solid var(--hair-strong)' }}>
              {[
                { value: String(words), label: 'Words', accent: true },
                { value: String(lines), label: 'Lines', accent: false },
                { value: String(tasks), label: 'Tasks', accent: false },
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 'calc(26px * var(--tf))', letterSpacing: '-0.015em', lineHeight: 1.1, color: item.accent ? 'var(--accent)' : 'var(--ink)' }}>
                    {item.value}
                  </div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(9px * var(--tf))', letterSpacing: 'calc(1.2px * var(--tf))', textTransform: 'uppercase', marginTop: 'calc(6px * var(--sf))', color: 'var(--ink-80)' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
            <Keys
              items={[
                ['Ctrl Z', 'Undo'],
                ['Tab', 'Indent'],
                ['Ctrl S', 'Export'],
              ]}
            />
          </Stack>
        </Rail>
      }
      actions={
        <button
          type="button"
          onClick={onExport}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 'calc(7px * var(--sf))',
            fontFamily: 'var(--sans)', fontSize: 'calc(12.5px * var(--tf))', fontWeight: 600,
            borderRadius: 'calc(2px * var(--sf))', padding: 'calc(8px * var(--sf)) calc(18px * var(--sf))',
            cursor: 'pointer', border: 'calc(1px * var(--sf)) solid transparent', textDecoration: 'none',
            background: 'none', lineHeight: 1.2, color: 'var(--ink)',
          }}
        >
          Export
        </button>
      }
    >
      <Card mono="Editor" title="Markdown Editor" accent>
        <div style={{ display: 'flex', gap: 'calc(12px * var(--sf))', alignItems: 'center', flexWrap: 'wrap' }}>
          <TabBar items={['Write', 'Preview']} active={tab} onSelect={(v) => setTab(v as Tab)} />
          <div style={{ flex: 1 }} />
          <Actions>
            {TOOLS.map((tool) => (
              <Button
                key={tool.key}
                kind={activeTool === tool.key ? 'primary' : 'secondary'}
                ariaLabel={tool.hint}
                title={tool.hint}
                onClick={() => onToolbar(tool.key)}
              >
                {tool.label}
              </Button>
            ))}
          </Actions>
        </div>

        {exported ? (
          <div role="status" style={{ display: 'flex', gap: 'calc(12px * var(--sf))', alignItems: 'center', color: 'var(--ink)', fontSize: 'calc(12px * var(--tf))' }}>
            <Tag accent>Exported</Tag>
            <span>document.md was written to your downloads.</span>
          </div>
        ) : null}

        <div role="tabpanel" aria-label="Write">
          {isEmpty ? (
            <EmptyState
              mono="Start"
              title="Your document is empty"
              detail="Type Markdown below, or tap a tool above to start a bold phrase, a list, a table, or a task."
              actionLabel="Type in the editor"
              onAction={() => {
                const ta = editorRef.current
                if (ta) ta.focus()
              }}
            />
          ) : null}
          <textarea
            ref={editorRef}
            aria-label="Markdown editor"
            value={text}
            onChange={(e) => onEditorChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={18}
            style={{
              width: '100%',
              minHeight: 'calc(300px * var(--sf))',
              fontFamily: 'var(--mono)',
              fontSize: 'calc(13px * var(--tf))',
              lineHeight: 1.6,
              color: 'var(--ink)',
              background: 'var(--paper)',
              border: 'calc(1px * var(--sf)) solid var(--line)',
              borderRadius: 'calc(6px * var(--sf))',
              padding: 'calc(12px * var(--sf))',
              resize: 'vertical',
            }}
          />
        </div>
        {tab === 'Preview' ? (
          <div
            ref={previewRef}
            role="tabpanel"
            aria-label="Preview"
            style={{ minHeight: 'calc(300px * var(--sf))', fontSize: 'calc(13px * var(--tf))', lineHeight: 1.6, color: 'var(--ink)', overflow: 'auto', marginTop: 'calc(12px * var(--sf))' }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : null}
      </Card>

      <Card mono="Details" title="Document" flush>
        <Body sm>
          <strong>document.md</strong> · {lines} lines · {chars} characters
        </Body>
        <div style={{ display: 'flex', gap: 'calc(12px * var(--sf))', alignItems: 'center', marginTop: 'calc(10px * var(--sf))' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(10px * var(--tf))', letterSpacing: 'calc(0.5px * var(--tf))', textTransform: 'uppercase', color: 'var(--ink-80)', background: 'var(--paper-deep)', padding: 'calc(5px * var(--sf)) calc(9px * var(--sf))', display: 'inline-block' }}>
            {isEmpty ? 'Ready' : 'Edited'}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(10px * var(--tf))', letterSpacing: 'calc(0.5px * var(--tf))', textTransform: 'uppercase', color: 'var(--ink-80)', background: 'var(--paper-deep)', padding: 'calc(5px * var(--sf)) calc(9px * var(--sf))', display: 'inline-block' }}>
            {tasks} task{tasks === 1 ? '' : 's'}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(9px * var(--tf))', letterSpacing: 'calc(0.8px * var(--tf))', textTransform: 'uppercase', border: 'calc(1px * var(--sf)) solid var(--ui-line2)', borderRadius: 'calc(3px * var(--sf))', padding: 'calc(2px * var(--sf)) calc(7px * var(--sf))', color: isEmpty ? 'var(--ink-80)' : 'var(--accent)' }}>
            {isEmpty ? 'Ready' : 'Ready to export'}
          </span>
        </div>
      </Card>
    </AppShell>
  )
}
