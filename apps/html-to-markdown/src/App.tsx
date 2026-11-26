// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Card, ResizablePanel, Stack } from '@lacuna/ui'
import { htmlToMarkdown } from '@lacuna/html-to-markdown'
import { markdownToHtml, sanitizeHtml } from '@lacuna/markdown-to-html'
import { CodeArea } from '@lacuna/code-area'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type Direction = 'HTML to Markdown' | 'Markdown to HTML'

const RECORD_KEY = 'lacuna.html-to-markdown'
const RECORD_VERSION = 1
const PANEL_ID = 'html-md-split'
const PANEL_DEFAULT = 320
const PANEL_MIN = 220
const PANEL_MAX = 760

interface AppRecord {
  input: string
  sanitize: boolean
  direction: Direction
}

const DEFAULT_RECORD: AppRecord = {
  input: '',
  sanitize: true,
  direction: 'HTML to Markdown',
}

function htmlToMdNoSanitize(html: string): string {
  const placeholders: string[] = []
  let working = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>|<script\b[^>]*\/>/gi, (match) => {
    const i = placeholders.length
    placeholders.push(match)
    return `\x00P${i}\x00`
  })

  const result = htmlToMarkdown(working)
    .replace(/\x00P(\d+)\x00/g, (_, i) => placeholders[Number(i)] ?? '')
    .replace(/\n+$/, '')
  return result
}

function fixTableRows(md: string): string {
  // The toolbox htmlToMarkdown emits each table row as `|| a | b ||` (a doubled
  // leading/trailing pipe). Normalize rows that start and end with a doubled
  // pipe to the canonical GFM `| a | b |`.
  return md
    .split('\n')
    .map((line) => {
      const t = line.trim()
      if (t.startsWith('||') && t.endsWith('||') && t.length >= 4) {
        return line.replace(/^(\s*)\|\|/, '$1|').replace(/\|\|(\s*)$/, '|$1')
      }
      return line
    })
    .join('\n')
}

function convert(input: string, direction: Direction, sanitize: boolean): string {
  if (input === '') return ''
  if (direction === 'HTML to Markdown') {
    const raw = sanitize ? htmlToMarkdown(sanitizeHtml(input)) : htmlToMdNoSanitize(input)
    return fixTableRows(raw)
  }
  return markdownToHtml(input)
}

export function App() {
  const { value: record, set: setRecord } = useLocalRecord<AppRecord>({
    key: RECORD_KEY,
    version: RECORD_VERSION,
    defaultValue: DEFAULT_RECORD,
  })
  const [direction, setDirection] = useState<Direction>(record.direction)
  const [input, setInput] = useState(record.input)
  const [sanitize, setSanitize] = useState(record.sanitize)
  const { copied, copy } = useClipboard()

  const output = useMemo(() => convert(input, direction, sanitize), [input, direction, sanitize])

  useEffect(() => {
    setRecord((prev) => ({ ...prev, input, sanitize, direction }))
  }, [input, sanitize, direction, setRecord])

  function handleCopy() {
    if (output === '') return
    void copy(output.replace(/\n+$/, '')).catch(() => undefined)
  }

  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ pointer: number; size: number } | null>(null)

  // Workaround for the toolbox ResizablePanel bug: its useEffect that adds
  // window pointermove/pointerup listeners never runs after onPointerDown
  // because start.current is a ref change (no re-render). We add our own
  // listeners that handle the drag independently.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const separator = container.querySelector('[role="separator"]') as HTMLButtonElement | null
    const panel = container.querySelector('.lc-resizable-panel') as HTMLDivElement | null
    if (!separator || !panel) return

    const onPointerDown = (event: PointerEvent) => {
      const valuenow = Number(separator.getAttribute('aria-valuenow') || '0')
      dragState.current = { pointer: event.clientX, size: valuenow }
    }

    const onPointerMove = (event: PointerEvent) => {
      const state = dragState.current
      if (!state) return
      const delta = event.clientX - state.pointer
      const next = Math.min(PANEL_MAX, Math.max(PANEL_MIN, state.size + delta))
      separator.setAttribute('aria-valuenow', String(Math.round(next)))
      panel.style.width = `${next}px`
      panel.style.flexBasis = `${next}px`
      try {
        localStorage.setItem(`lacuna-layout:${PANEL_ID}`, String(Math.round(next)))
      } catch {
        // ignore
      }
    }

    const onPointerUp = () => {
      dragState.current = null
    }

    separator.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      separator.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  const tabs: Array<{ id: Direction; label: string }> = [
    { id: 'HTML to Markdown', label: 'HTML to Markdown' },
    { id: 'Markdown to HTML', label: 'Markdown to HTML' },
  ]

  return (
    <AppShell name="HTML Markdown Converter" icon="docs" hue="blue" category="Productivity">
      <Stack lg>
        <Card>
          <div role="tablist" aria-label="Conversion direction" style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={direction === tab.id}
                onClick={() => setDirection(tab.id)}
                style={{
                  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                  borderRadius: 'calc(6px * var(--sf))',
                  border: 'none',
                  background: direction === tab.id ? 'var(--fill-100)' : 'transparent',
                  color: direction === tab.id ? 'var(--ink-100)' : 'var(--ink-60)',
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: 'var(--body-sm)',
                  transition: 'background 150ms ease, color 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Card>
        <div
          ref={containerRef}
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 'calc(520px * var(--sf))',
            alignItems: 'stretch',
          }}
        >
          <ResizablePanel
            id={PANEL_ID}
            label="Left Pane"
            defaultSize={PANEL_DEFAULT}
            minSize={PANEL_MIN}
            maxSize={PANEL_MAX}
          >
            <Card title="Input" flush style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CodeArea
                value={input}
                onChange={(next: string) => setInput(next)}
                ariaLabel="Input"
                language={direction === 'HTML to Markdown' ? 'html' : 'md'}
              />
            </Card>
          </ResizablePanel>
          <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
            <Card title="Output" flush style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Stack>
                <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                  <CodeArea
                    value={output}
                    onChange={() => undefined}
                    ariaLabel="Output"
                    readOnly
                    language={direction === 'HTML to Markdown' ? 'plain' : 'html'}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="lc-btn primary" onClick={handleCopy} disabled={output === ''}>
                    {copied ? 'Copied' : 'Copy output'}
                  </button>
                  <label className="lk-check" style={{ display: 'flex', alignItems: 'center', gap: 'calc(4px * var(--sf))' }}>
                    <input
                      type="checkbox"
                      checked={sanitize}
                      onChange={(event) => setSanitize(event.target.checked)}
                      aria-label="Sanitize"
                    />
                    <span>Sanitize</span>
                  </label>
                  <span aria-live="polite">
                    {copied ? 'Copied to clipboard' : ''}
                  </span>
                </div>
              </Stack>
            </Card>
          </div>
        </div>
      </Stack>
    </AppShell>
  )
}
