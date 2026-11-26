import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  PrimaryButton,
  Row,
  TextInput,
} from '@lacuna/ui'
import { addNote, deleteNote, listNotes, updateNoteContent, type Note } from './host'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseTaskLines(content: string): { checked: boolean; text: string }[] {
  const results: { checked: boolean; text: string }[] = []
  for (const line of content.split('\n')) {
    const m = /^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line)
    if (m !== null) {
      results.push({ checked: m[1]?.toLowerCase() === 'x', text: m[2] ?? '' })
    }
  }
  return results
}

function renderPreview(content: string): string {
  const tasks = parseTaskLines(content)
  const html = markdownToHtml(content)
  let processed = html
  tasks.forEach((task, i) => {
    const safeText = escapeHtml(task.text)
    const checkedAttr = task.checked ? ' checked' : ''
    const marker = `<input type="checkbox"${checkedAttr} disabled> ${safeText}`
    const replacement = `<input type="checkbox"${checkedAttr} aria-label="${safeText}" data-idx="${i}"> ${safeText}`
    processed = processed.replace(marker, replacement)
  })
  return processed.replace(/\[\[([^\]]+)\]\]/g, (_match, title: string) => {
    const safeTitle = escapeHtml(title)
    return `<a href="#" data-wiki="${safeTitle}">${safeTitle}</a>`
  })
}

function exportHtml(content: string): string {
  return markdownToHtml(content).replace(
    /<input type="checkbox"( checked)? disabled>/g,
    (_match, checked?: string) =>
      checked ? '<input type="checkbox" checked>' : '<input type="checkbox">'
  )
}

function toggleTask(content: string, taskText: string, toChecked: boolean): string {
  const re = new RegExp(
    `^\\s*([-*+]\\s+)\\[(${toChecked ? ' ' : 'xX'})\\]\\s+(?=${escapeRegExp(taskText)})`,
    'm'
  )
  return content.replace(re, (_match, prefix: string) =>
    prefix + (toChecked ? '[x] ' : '[ ] ')
  )
}

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => listNotes())
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const all = listNotes()
    return all.length > 0 ? all[0].id : null
  })
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState(() => {
    const all = listNotes()
    if (all.length === 0) return ''
    return all[0].content
  })
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'Edit' | 'Preview'>('Edit')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId]
  )

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((n) => n.title.toLowerCase().includes(q))
  }, [notes, search])

  useEffect(() => {
    if (selectedNote && tab === 'Edit') {
      textareaRef.current?.focus()
    }
  }, [selectedNote, tab])

  const handlePreviewClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement

      // Handle wiki link clicks
      const link = target.closest('a[data-wiki]')
      if (link) {
        event.preventDefault()
        const title = link.getAttribute('data-wiki') ?? ''
        const allNotes = listNotes()
        const targetNote = allNotes.find(
          (n) => n.title.toLowerCase() === title.toLowerCase()
        )
        if (targetNote) {
          setSelectedId(targetNote.id)
          setDraftContent(targetNote.content)
          setNotes(listNotes())
          setTab('Edit')
        }
        return
      }

      // Handle checkbox clicks
      if (
        target.tagName === 'INPUT' &&
        target.getAttribute('type') === 'checkbox' &&
        target.getAttribute('data-idx') !== null
      ) {
        const currentNote = listNotes().find((n) => n.id === selectedId)
        if (!currentNote) return
        const idx = target.getAttribute('data-idx')
        if (idx === null) return
        const taskIndex = parseInt(idx, 10)
        const tasks = parseTaskLines(currentNote.content)
        const task = tasks[taskIndex]
        if (!task) return
        const newContent = toggleTask(currentNote.content, task.text, !task.checked)
        updateNoteContent(currentNote.id, newContent)
        setDraftContent(newContent)
        setNotes(listNotes())
      }
    },
    [selectedId]
  )

  const createNote = useCallback(() => {
    const title = draftTitle.trim()
    const note = addNote(title)
    setNotes(listNotes())
    setSelectedId(note.id)
    setDraftTitle('')
    setDraftContent('')
    setTab('Edit')
  }, [draftTitle])

  const handleContentChange = useCallback(
    (value: string) => {
      setDraftContent(value)
      if (selectedNote) {
        updateNoteContent(selectedNote.id, value)
        setNotes(listNotes())
      }
    },
    [selectedNote]
  )

  const handleExport = useCallback(async () => {
    if (!selectedNote) return
    const html = exportHtml(selectedNote.content)
    try {
      await navigator.clipboard.writeText(html)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = html
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }, [selectedNote])

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id)
      setNotes(listNotes())
      if (selectedId === id) {
        setSelectedId(null)
        setDraftContent('')
      }
    },
    [selectedId]
  )

  const previewHtml = useMemo(
    () => (selectedNote ? renderPreview(selectedNote.content) : ''),
    [selectedNote]
  )

  return (
    <AppShell
      name="Personal Wiki"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
    >
      <Card mono="New" title="New note">
        <FormGrid>
          <TextInput label="Title" value={draftTitle} onChange={setDraftTitle} />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={createNote}>New note</PrimaryButton>
        </Actions>
      </Card>

      <Card mono={`${filteredNotes.length} shown`} title="Notes">
        <TextInput label="Search" type="search" value={search} onChange={setSearch} />
        {filteredNotes.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No notes yet"
            detail="Create your first note above."
            actionLabel="New note"
          />
        ) : (
          <List label="Notes">
            {filteredNotes.map((note) => (
              <Row
                key={note.id}
                title={note.title}
                hot={note.id === selectedId}
                onClick={() => {
                  setSelectedId(note.id)
                  setDraftContent(note.content)
                  setTab('Edit')
                }}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Delete ${note.title}`}
                    onClick={() => handleDelete(note.id)}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>

      {selectedNote && (
        <Card
          mono="Editor"
          title="Editor"
          actions={
            <Actions>
              <Button kind="secondary" onClick={handleExport}>
                Export HTML
              </Button>
            </Actions>
          }
        >
          <div role="tablist" aria-label="Note editor">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'Edit'}
              className={`lc-tab${tab === 'Edit' ? ' active' : ''}`}
              onClick={() => setTab('Edit')}
            >
              Edit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'Preview'}
              className={`lc-tab${tab === 'Preview' ? ' active' : ''}`}
              onClick={() => setTab('Preview')}
            >
              Preview
            </button>
          </div>
          <div style={{ visibility: tab === 'Edit' ? 'visible' : 'hidden', height: tab === 'Edit' ? undefined : 0, overflow: 'hidden' }}>
            <FormGrid>
              <div className="lc-field">
                <span className="lc-field-label" aria-hidden="true">Content</span>
                <textarea
                  ref={(el) => {
                    textareaRef.current = el
                  }}
                  className="lc-input"
                  aria-label="Content"
                  rows={10}
                  value={draftContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                />
              </div>
            </FormGrid>
          </div>
          {tab === 'Preview' && (
            <div
              className="lk-preview"
              onClick={handlePreviewClick}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}
