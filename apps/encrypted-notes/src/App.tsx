// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { encrypt, verifyPassphrase } from '@lacuna/passphrase-crypto'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { ConfirmDialog } from '@lacuna/confirm-dialog'
import { useClipboard } from '@lacuna/use-clipboard'
import { createMockRecordStore } from '@lacuna/host-mock'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  List,
  MonoLabel,
  PrimaryButton,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'

interface Note {
  id: string
  title: string
  body: string
  encrypted: string
  passphrase: string
  tag: string
  updatedAt: number
}

type View = { kind: 'list' } | { kind: 'edit'; id: string; title: string }

function isNote(v: unknown): v is Note {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.body === 'string' &&
    typeof o.encrypted === 'string' &&
    typeof o.passphrase === 'string' &&
    typeof o.tag === 'string' &&
    typeof o.updatedAt === 'number'
  )
}

function noteTag(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  const used = new Set(words.map((w) => w.toLowerCase()))
  const generic = ['note', 'notes', 'untitled']
  const candidate = ['secret', 'private', 'encrypted'].find((w) => !used.has(w))
  if (candidate) return candidate
  return (['draft', 'memo', 'entry'].find((w) => !used.has(w) && !generic.includes(w))) ?? 'memo'
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const store = createMockRecordStore<Note>({
  key: 'lacuna.encrypted-notes.notes',
  validate: isNote,
  idPrefix: 'note',
})

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => store.list())
  const [view, setView] = useState<View>({ kind: 'list' })
  const [newNote, setNewNote] = useState({ title: '', body: '', passphrase: '' })
  const [editBody, setEditBody] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [unlocked, setUnlocked] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { copy } = useClipboard({ timeoutMs: 2000 })

  function refresh() {
    setNotes(store.list())
  }

  function resetForm() {
    setNewNote({ title: '', body: '', passphrase: '' })
    setPassphrase('')
    setUnlocked(true)
    setError(null)
    setStatus(null)
  }

  function saveNote() {
    const { title, body, passphrase: pass } = newNote
    if (!title.trim()) {
      setError('Enter a title first')
      return
    }
    if (!body.trim()) {
      setError('Write some text first')
      return
    }
    if (!pass) {
      setError('Enter a passphrase first')
      return
    }
    const now = Date.now()
    const trimmed = title.trim()
    const created = store.add({
      title: trimmed,
      body,
      encrypted: '',
      passphrase: pass,
      tag: noteTag(trimmed),
      updatedAt: now,
    })
    refresh()
    resetForm()
    setStatus('Saved')
    setView({ kind: 'list' })
    void (async () => {
      try {
        const payload = await encrypt(body, pass, { iterations: 100 })
        store.update(created.id, { encrypted: JSON.stringify(payload) })
        refresh()
      } catch {
        setError('Could not encrypt the note')
      }
    })()
  }

  function openNote(id: string) {
    const note = notes.find((n) => n.id === id)
    if (!note) return
    setView({ kind: 'edit', id, title: note.title })
    setEditBody(note.body)
    setPassphrase('')
    setUnlocked(true)
    setError(null)
    setStatus(null)
  }

  async function unlockNote() {
    if (view.kind !== 'edit') return
    const note = notes.find((n) => n.id === view.id)
    if (!note) return
    try {
      const payload = JSON.parse(note.encrypted)
      const ok = await verifyPassphrase(payload, passphrase)
      if (ok) {
        setEditBody(note.body)
        setUnlocked(true)
        setError(null)
        setStatus(`Unlocked ${note.title}`)
      } else {
        setUnlocked(false)
        setError('Incorrect passphrase')
      }
    } catch {
      setUnlocked(false)
      setError('Incorrect passphrase')
    }
  }

  function saveChanges() {
    if (view.kind !== 'edit') return
    const note = notes.find((n) => n.id === view.id)
    if (!note) return
    const now = Date.now()
    store.update(view.id, {
      body: editBody,
      tag: noteTag(note.title),
      updatedAt: now,
    })
    refresh()
    setStatus('Saved')
    void (async () => {
      try {
        const payload = await encrypt(editBody, note.passphrase, { iterations: 100 })
        store.update(view.id, { encrypted: JSON.stringify(payload) })
        refresh()
      } catch {
        setError('Could not save the note')
      }
    })()
  }

  function deleteNote() {
    if (view.kind === 'edit') {
      store.remove(view.id)
      refresh()
      setView({ kind: 'list' })
      setStatus('Deleted')
    }
    setConfirmDelete(false)
  }

  async function exportMarkdown() {
    if (view.kind !== 'edit') return
    const text = editBody
    await copy(text)
    setStatus('Copied to clipboard')
  }

  const markdownHtml = useMemo(() => {
    if (!unlocked || view.kind !== 'edit') return null
    return markdownToHtml(editBody)
  }, [unlocked, view.kind, editBody])

  return (
    <AppShell
      name="Encrypted Notes"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
      status={status}
    >
      {view.kind === 'list' && (
        <>
          <Card mono="New" title="New note">
            <FormGrid>
              <TextInput
                label="Title"
                value={newNote.title}
                onChange={(v) => setNewNote((prev) => ({ ...prev, title: v }))}
                placeholder="Note title"
                type="search"
              />
              <TextInput
                label="Body"
                value={newNote.body}
                onChange={(v) => setNewNote((prev) => ({ ...prev, body: v }))}
                placeholder="Write your note in Markdown"
                rows={4}
              />
              <label className="lc-field">
                <span className="lc-field-label">Passphrase</span>
                <input
                  className="lc-input"
                  type="text"
                  role="searchbox"
                  value={newNote.passphrase}
                  placeholder="Set a passphrase to encrypt this note"
                  onChange={(e) => setNewNote((prev) => ({ ...prev, passphrase: e.target.value }))}
                />
              </label>
            </FormGrid>
            {error && <MonoLabel accent>{error}</MonoLabel>}
            <PrimaryButton onClick={saveNote}>Save note</PrimaryButton>
          </Card>

          <Card mono={`${notes.length} notes`} title="Notes">
            {notes.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No notes yet"
                detail="Create your first encrypted note above."
                actionLabel="New note"
              />
            ) : (
              <List label="Notes">
                {notes.map((note) => (
                  <Row
                    key={note.id}
                    title={note.title}
                    meta={<>{formatDate(note.updatedAt)} · <Tag>{note.tag}</Tag></>}
                    value="locked"
                    onClick={() => openNote(note.id)}
                  />
                ))}
              </List>
            )}
          </Card>
        </>
      )}

      {view.kind === 'edit' && (
        <Card mono="Edit" title={view.title}>
          <FormGrid>
            <TextInput
              label="Body"
              value={editBody}
              onChange={setEditBody}
              placeholder="Edit your note"
              rows={6}
            />
            <label className="lc-field">
              <span className="lc-field-label">Passphrase</span>
              <input
                className="lc-input"
                type="text"
                role="searchbox"
                value={passphrase}
                placeholder="Enter passphrase"
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </label>
          </FormGrid>
          {error && <MonoLabel accent>{error}</MonoLabel>}
          {unlocked && markdownHtml ? (
            <div
              className="lc-prose"
              style={{
                fontFamily: 'var(--serif)',
                lineHeight: 1.6,
                padding: 'calc(8px * var(--sf))',
                margin: 0,
              }}
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          ) : null}
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
            <PrimaryButton onClick={saveChanges}>Save changes</PrimaryButton>
            <Button kind="secondary" onClick={() => void unlockNote()}>Unlock</Button>
            {unlocked ? (
              <Button kind="secondary" onClick={() => void exportMarkdown()}>
                Export Markdown
              </Button>
            ) : null}
            <Button kind="secondary" onClick={() => setView({ kind: 'list' })}>
              Back to notes
            </Button>
            <Button kind="danger" onClick={() => setConfirmDelete(true)}>
              Delete note
            </Button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete note"
        message="Delete this note?"
        confirmLabel="Confirm delete"
        cancelLabel="Cancel"
        danger
        onConfirm={deleteNote}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppShell>
  )
}
