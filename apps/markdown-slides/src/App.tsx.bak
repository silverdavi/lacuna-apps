// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react'
import { AppShell, Button, Rail } from '@lacuna/ui'
import { CodeArea } from '@lacuna/code-area'
import { useUndoStack } from '@lacuna/use-undo-stack'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { toLower } from '@lacuna/text-transforms'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { useDeck } from './host/useDeck'
import { DEFAULT_DECK } from './host'
import './app.css'

type Tab = 'editor' | 'preview' | 'both'

const MARKER = '\n---\n'

function splitSlides(text: string): string[] {
  return text.split(MARKER)
}

function slideIndexOfOffset(text: string, offset: number): number {
  let slide = 0
  let index = text.indexOf(MARKER)
  while (index !== -1) {
    if (index <= offset) {
      slide += 1
    } else {
      break
    }
    index = text.indexOf(MARKER, index + MARKER.length)
  }
  return slide
}

function countLines(text: string): number {
  return text.length === 0 ? 0 : text.split('\n').length
}

function wordCountOf(text: string): number {
  const trimmed = text.trim()
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
}

function enableTaskCheckboxes(html: string): string {
  return html.replace(/<input type="checkbox"((?:\s+checked)?)\s+disabled>/g, '<input type="checkbox"$1>')
}

function setTaskChecked(text: string, label: string, checked: boolean): string {
  const lines = text.split('\n')
  const prefixRe = /^(\s*[-*+]\s+\[)([ xX])(\]\s+)(.*)$/
  for (let s = 0; s < lines.length; s += 1) {
    const line = lines[s] ?? ''
    const m = prefixRe.exec(line)
    if (m === null) continue
    const taskLabel = m[4] ?? ''
    if (taskLabel === label) {
      const current = (m[2] ?? ' ').toLowerCase() === 'x'
      if (current === checked) return text
      lines[s] = `${m[1] ?? ''}${checked ? 'x' : ' '}${m[3] ?? ''}${m[4] ?? ''}`
      return lines.join('\n')
    }
  }
  return text
}

export function App() {
  const { value: record, set: setRecord } = useDeck()
  const { value: text, set: setText, undo, redo, canUndo, canRedo, reset } = useUndoStack(record.text, { limit: 100 })
  const [tab, setTab] = useState<Tab>('both')
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const { copied, copy } = useClipboard()

  const editorWrapRef = useRef<HTMLDivElement | null>(null)
  const prevTextRef = useRef(text)

  const slides = useMemo(() => splitSlides(text), [text])
  const totalSlides = slides.length
  const slideNumber = Math.min(activeSlide + 1, totalSlides)

  const showEditor = tab === 'both' || tab === 'editor'
  const showPreview = tab === 'both' || tab === 'preview'

  const wordCount = wordCountOf(text)
  const lineCount = countLines(text)

  const refreshSlide = useCallback(() => {
    const ta = editorWrapRef.current?.querySelector<HTMLTextAreaElement>('.ca-ta')
    if (ta === null || ta === undefined) return
    const offset = ta.selectionStart ?? 0
    setActiveSlide(slideIndexOfOffset(text, offset))
  }, [text])

  const onEditorChange = useCallback(
    (next: string) => {
      const prev = prevTextRef.current
      let common = 0
      const minLen = Math.min(prev.length, next.length)
      while (common < minLen && prev[common] === next[common]) common += 1
      prevTextRef.current = next
      setText(next)
      setActiveSlide(slideIndexOfOffset(next, common))
      setRecord((p) => ({ ...p, text: next }))
    },
    [setText, setRecord]
  )

  const onUndo = useCallback(() => {
    undo()
  }, [undo])

  const onRedo = useCallback(() => {
    redo()
  }, [redo])

  useEffect(() => {
    setRecord((p) => ({ ...p, text }))
  }, [text, setRecord])

  const onReset = useCallback(() => {
    reset(DEFAULT_DECK.text)
    setActiveSlide(0)
    setRecord({ ...DEFAULT_DECK })
  }, [reset, setRecord])

  const onCopy = useCallback(() => {
    void copy(text)
  }, [copy, text])

  const doPrint = useCallback(() => {
    setPrinting(true)
    window.setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 0)
  }, [])

  const doJson = useCallback(() => {
    saveText(text, { filename: 'deck.json', mimeType: 'application/json' })
  }, [text])

  const onExportSelect = useCallback(
    (id: string) => {
      if (id === 'print') doPrint()
      if (id === 'json') doJson()
      setExportOpen(false)
    },
    [doPrint, doJson]
  )

  useEffect(() => {
    if (!exportOpen) return
    const onDoc = (e: globalThis.MouseEvent) => {
      const t = e.target as Node
      if (t instanceof Element && t.closest('.ms-export') === null) {
        setExportOpen(false)
      }
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportOpen])

  useEffect(() => {
    refreshSlide()
  }, [refreshSlide])

  const onEditorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Home' || e.key === 'End')) {
        window.requestAnimationFrame(() => refreshSlide())
      }
    },
    [refreshSlide]
  )

  const onPreviewClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target
      if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return
      const li = target.closest('li')
      if (li === null || li === undefined) return
      const label = (li.textContent ?? '').trim()
      const next = setTaskChecked(text, label, target.checked)
      if (next !== text) {
        setText(next)
        setRecord((p) => ({ ...p, text: next }))
      }
    },
    [text, setText, setRecord]
  )

  const statusText = `${totalSlides} ${totalSlides === 1 ? 'slide' : 'slides'} · Slide ${slideNumber} of ${totalSlides}`

  return (
    <AppShell
      name="Markdown Slide Deck"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={statusText}
      status={copied ? 'Copied to clipboard' : printing ? 'Printing…' : undefined}
      actions={
        <>
          <Button kind="secondary" ariaLabel="Copy deck" onClick={onCopy}>
            Copy
          </Button>
          <Button kind="secondary" ariaLabel="Reset deck" onClick={onReset}>
            Reset
          </Button>
          <div className="ms-export">
            <button
              type="button"
              className="ms-export-trigger"
              aria-label="Export"
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              onClick={() => setExportOpen((v) => !v)}
            >
              Export
            </button>
            {exportOpen && (
              <ul className="ms-export-menu" role="menu" aria-label="Export">
                <li role="none">
                  <button type="button" role="menuitem" aria-label="Print" onClick={() => onExportSelect('print')}>
                    Print
                  </button>
                </li>
                <li role="none">
                  <button type="button" role="menuitem" aria-label="JSON" onClick={() => onExportSelect('json')}>
                    JSON
                  </button>
                </li>
              </ul>
            )}
          </div>
        </>
      }
      side={
        <Rail
          title="Deck"
          note={toLower('markdown')}
          chips={[
            `${totalSlides} ${totalSlides === 1 ? 'slide' : 'slides'}`,
            `${lineCount} lines`,
            `${wordCount} words`
          ]}
        >
          <div className="ms-rail-hint">
            <span className="ms-rail-label">Split on</span>
            <code className="ms-rail-code">---</code>
          </div>
        </Rail>
      }
    >
      <div role="tablist" aria-label="Views" className="ms-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'editor'}
          className={`lc-tab${tab === 'editor' ? ' active' : ''}`}
          onClick={() => setTab('editor')}
        >
          Editor
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'preview'}
          className={`lc-tab${tab === 'preview' ? ' active' : ''}`}
          onClick={() => setTab('preview')}
        >
          Preview
        </button>
      </div>

      <div className={`ms-pane${showEditor && showPreview ? ' ms-pane-split' : ''}`}>
        {showEditor && (
          <div className="ms-editor" ref={editorWrapRef} onKeyDown={onEditorKeyDown}>
            <CodeArea value={text} onChange={onEditorChange} language="md" ariaLabel="Slide deck editor" tabSize={2} />
            <div className="ms-toolbar" role="toolbar" aria-label="Edit actions">
              <Button kind="secondary" ariaLabel="Undo last edit" onClick={onUndo} disabled={!canUndo}>
                Undo
              </Button>
              <Button kind="secondary" ariaLabel="Redo last edit" onClick={onRedo} disabled={!canRedo}>
                Redo
              </Button>
            </div>
            <div className="ms-statusbar" role="status">
              <span className="ms-status-count">
                {totalSlides} {totalSlides === 1 ? 'slide' : 'slides'}
              </span>
              <span className="ms-status-pos">
                Slide {slideNumber} of {totalSlides}
              </span>
            </div>
          </div>
        )}

        {showPreview && (
          <div className="ms-preview" onClick={onPreviewClick}>
            {slides.map((slide, s) => (
              <section key={`slide-${s}`} className="ms-slide">
                <div className="ms-slide-body" dangerouslySetInnerHTML={{ __html: enableTaskCheckboxes(markdownToHtml(slide)) }} />
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
