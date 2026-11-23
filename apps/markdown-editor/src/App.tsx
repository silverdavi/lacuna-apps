// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card } from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { saveText } from '@lacuna/file-save-open'
import { useLocalRecord } from '@lacuna/use-local-record'

type Tab = 'Write' | 'Preview'

function wordCount(text: string): number {
  const trimmed = text.trim()
  if (trimmed === '') return 0
  return trimmed.split(/\s+/).length
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

export function App() {
  const [tab, setTab] = useState<Tab>('Write')
  const { value: text, set: setText } = useLocalRecord<string>({
    key: 'markdown-editor-document',
    version: 0,
    defaultValue: '',
  })

  const html = useMemo(() => markdownToHtml(text, { taskLists: true, tables: true }), [text])
  const words = wordCount(text)

  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLInputElement
      if (target.tagName !== 'INPUT' || target.type !== 'checkbox') return
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      let index = -1
      for (let i = 0; i < checkboxes.length; i += 1) {
        if (checkboxes[i] === target) {
          index = i
          break
        }
      }
      if (index < 0) return
      e.preventDefault()
      setText((prev) => toggleTaskItem(prev, index))
    }
    container.addEventListener('click', handler)
    return () => {
      container.removeEventListener('click', handler)
    }
  }, [setText])

  const onExport = useCallback(() => {
    saveText(text, { filename: 'document.md', mimeType: 'text/markdown' })
  }, [text])

  const showWrite = tab === 'Write'
  const showPreview = tab === 'Preview'

  return (
    <AppShell
      name="Markdown Editor"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={`${words} ${words === 1 ? 'word' : 'words'}`}
      actions={
        <Button kind="ghost" onClick={onExport}>
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
            borderBottom: '1px solid var(--ui-line2)',
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

        <div
          style={{
            display: 'flex',
            gap: 'calc(16px * var(--sf))',
            minHeight: 'calc(300px * var(--sf))',
          }}
        >
          <div
            role="tabpanel"
            aria-label="Write"
            style={{
              flex: showWrite ? 1 : 'none',
              display: showWrite ? 'block' : 'none',
            }}
          >
            <CodeArea
              value={text}
              onChange={setText}
              language="md"
              ariaLabel="Markdown editor"
              showLineNumbers
            />
          </div>

          <div
            ref={previewRef}
            role="tabpanel"
            aria-label="Preview"
            style={{
              flex: showPreview ? 1 : 'none',
              display: showPreview ? 'block' : 'none',
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
