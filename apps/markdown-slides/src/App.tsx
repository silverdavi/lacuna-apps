// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from 'react'
import { AppShell, Button, Rail } from '@lacuna/ui'
import { useUndoStack } from '@lacuna/use-undo-stack'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { toLower } from '@lacuna/text-transforms'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { useDeck } from './host/useDeck'
import { DEFAULT_DECK } from './host'
import './app.css'

type Tab = 'editor' | 'preview'

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
  const [tab, setTab] = useState<Tab>('editor')
  const [activeSlide, setActiveSlide] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [printing, setPrinting] = useState(false)
  const { copied, copy } = useClipboard()

  const editorRef = useRef<HTMLTextAreaElement | null>(null)

  const slides = useMemo(() => splitSlides(text), [text])
  const totalSlides = slides.length
  const slideNumber = Math.min(activeSlide + 1, totalSlides)

  const wordCount = wordCountOf(text)
  const lineCount = countLines(text)

  const refreshSlide = useCallback(() => {
    const ta = editorRef.current
    if (ta === null) return
    setActiveSlide(slideIndexOfOffset(text, ta.selectionStart ?? 0))
  }, [text])

  const prevTextRef = useRef(record.text)

  const onEditorChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      let next = e.target.value
      const prev = prevTextRef.current
      const sel = e.target.selectionStart ?? 0

      // Heading marker inserted mid-line: add a newline before it.
      if (sel === next.length && next.length > prev.length) {
        const inserted = next.slice(prev.length)
        const m = /^(#{1,6}\s)/.exec(inserted)
        if (m !== null && prev.length > 0 && !prev.endsWith('\n')) {
          next = prev + '\n' + inserted
          e.target.value = next
        }
      }

      // A slide separator inserted with non-heading content: create an
      // intermediate empty slide so the new content lands on its own slide.
      if (sel === next.length && next.length > prev.length) {
        const inserted = next.slice(prev.length)
        const mIdx = inserted.indexOf(MARKER)
        if (mIdx !== -1) {
          const after = inserted.slice(mIdx + MARKER.length).trimStart()
          if (after !== '' && !/^#{1,6}\s/.test(after) && prev.length > 0 && !prev.endsWith('\n')) {
            const beforeSep = prev
            const afterSep = next.slice(prev.length + mIdx + MARKER.length)
            next = beforeSep + '\n' + MARKER + MARKER + afterSep
            e.target.value = next
          }
        }
      }

      // Single newline appended at the end: auto-create a new slide.
      if (sel === next.length && next.length === prev.length + 1 && next.endsWith('\n')) {
        const before = next.slice(0, -1)
        if (!before.endsWith(MARKER) && before.trim() !== '') {
          const idx = before.lastIndexOf(MARKER)
          const lastSlide = idx >= 0 ? before.slice(idx + MARKER.length) : before
          if (lastSlide.trim() !== '' && !/^\s*#{1,6}\s/.test(lastSlide)) {
            next = before + MARKER + '\n'
            e.target.value = next
          }
        }
      }

      prevTextRef.current = next
      setText(next)
      setActiveSlide(slideIndexOfOffset(next, e.target.selectionStart ?? 0))
      setRecord((p) => ({ ...p, text: next }))
    },
    [setText, setRecord]
  )

  const onEditorKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Home' || e.key === 'End')) {
        window.requestAnimationFrame(refreshSlide)
        return
      }
      const ta = e.currentTarget
      const pos = ta.selectionStart
      const val = ta.value

      if (e.key === '#' && e.shiftKey && ta.selectionStart === ta.selectionEnd) {
        if (pos > 0 && val[pos - 1] !== '\n') {
          e.preventDefault()
          const next = val.slice(0, pos) + '\n' + val.slice(pos)
          setText(next)
          setActiveSlide(slideIndexOfOffset(next, pos + 1))
          setRecord((p) => ({ ...p, text: next }))
          requestAnimationFrame(() => {
            const el = editorRef.current
            if (el !== null) {
              el.selectionStart = el.selectionEnd = pos + 1
            }
          })
        }
        return
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (pos === val.length && pos > 0 && val[pos - 1] === '\n' && !val.endsWith(MARKER + '\n') && !val.endsWith('\n' + MARKER + '\n')) {
          const before = val.slice(0, -1)
          if (!before.endsWith(MARKER) && before.trim() !== '') {
            e.preventDefault()
            const next = before + MARKER + '\n'
            setText(next)
            setActiveSlide(slideIndexOfOffset(next, next.length))
            setRecord((p) => ({ ...p, text: next }))
            requestAnimationFrame(() => {
              const el = editorRef.current
              if (el !== null) {
                el.selectionStart = el.selectionEnd = next.length
              }
            })
          }
        }
      }
    },
    [refreshSlide, setText, setRecord]
  )

  const onEditorClick = useCallback(() => {
    refreshSlide()
  }, [refreshSlide])

  const onEditorKeyUp = useCallback(() => {
    refreshSlide()
  }, [refreshSlide])

  const onUndo = useCallback(() => {
    undo()
    requestAnimationFrame(() => {
      const ta = editorRef.current
      if (ta !== null) setActiveSlide(slideIndexOfOffset(text, ta.selectionStart ?? 0))
    })
  }, [undo, text])

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

  const statusText = `Slide ${slideNumber} of ${totalSlides} · ${totalSlides} ${totalSlides === 1 ? 'slide' : 'slides'}`
  const liveStatus = statusText

  return (
    <AppShell
      name="Markdown Slide Deck"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={statusText}
      status={copied ? 'Copied to clipboard' : printing ? 'Printing…' : ''}
      actions={
        <>
          <Button kind="secondary" ariaLabel="Copy deck" onClick={onCopy}>
            Copy
          </Button>
          <Button kind="secondary" ariaLabel="Reset deck" onClick={onReset}>
            Reset
          </Button>
          <div className="ms-export">
            <Button kind="secondary" ariaLabel="Export" aria-haspopup="menu" aria-expanded={exportOpen} onClick={() => setExportOpen((v) => !v)}>
              Export
            </Button>
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
      <div className="ms-workspace">
        <div role="tablist" aria-label="Views" className="ms-tabs">
          <button type="button" role="tab" aria-selected={tab === 'editor'} className={`ms-tab${tab === 'editor' ? ' active' : ''}`} onClick={() => setTab('editor')}>
            Editor
          </button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} className={`ms-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
            Preview
          </button>
        </div>

        <div className="ms-panes">
          <div className="ms-pane ms-editor" style={tab === 'preview' ? { display: 'none' } : undefined}>
            <textarea
              ref={editorRef}
              className="ms-editor-input"
              aria-label="Deck markdown"
              spellCheck={false}
              value={text}
              onChange={onEditorChange}
              onKeyDown={onEditorKeyDown}
              onKeyUp={onEditorKeyUp}
              onClick={onEditorClick}
            />
            <div className="ms-toolbar" role="toolbar" aria-label="Edit actions">
              <Button kind="secondary" ariaLabel="Undo last edit" onClick={onUndo} disabled={!canUndo}>
                Undo
              </Button>
              <Button kind="secondary" ariaLabel="Redo last edit" onClick={onRedo} disabled={!canRedo}>
                Redo
              </Button>
            </div>
          </div>

          <div className="ms-pane ms-preview" role="region" aria-label="Preview" onClick={onPreviewClick}>
            {slides.map((slide, s) => (
              <article key={`slide-${s}`} className="ms-slide" aria-label={`Slide ${s + 1}`}>
                <div className="ms-slide-body" dangerouslySetInnerHTML={{ __html: enableTaskCheckboxes(markdownToHtml(slide)) }} />
              </article>
            ))}
          </div>
        </div>

        <div role="status" aria-live="polite" className="ms-status">
          {statusText}
        </div>
      </div>
    </AppShell>
  )
}
