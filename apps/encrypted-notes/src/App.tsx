// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { encrypt, verifyPassphrase } from '@lacuna/passphrase-crypto'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { ConfirmDialog } from '@lacuna/confirm-dialog'
import { useClipboard } from '@lacuna/use-clipboard'
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
  TextInput,
} from '@lacuna/ui'

interface NoteData {
  title: string
  body: string
  encrypted: string
}

type View =
  | { kind: 'list' }
  | { kind: 'edit'; id: string; title: string }

export function App() {
  const { state, actions } = useCollection<NoteData>({
    storageKey: 'lacuna.encrypted-notes.notes',
  })
  const [view, setView] = useState<View>({ kind: 'list' })
  const [newNote, setNewNote] = useState({ title: '', body: '', passphrase: '' })
  const [editBody, setEditBody] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [unlocked, setUnlocked] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  const notes = useMemo(
    () =>
      state.activeItems.map((item) => ({
        id: item.id,
        title: item.data.title,
        body: item.data.body,
        encrypted: item.data.encrypted,
        updatedAt: item.updatedAt,
      })),
    [state.activeItems],
  )

  async function saveNote() {
    const { title, body, passphrase } = newNote
    if (!title.trim()) return setError('Enter a title first')
    if (!passphrase.trim()) return setError('Enter a passphrase first')
    try {
      const payload = await encrypt(body, passphrase)
      actions.add({ title: title.trim(), body, encrypted: JSON.stringify(payload) })
      setNewNote({ title: '', body: '', passphrase: '' })
      setError(null)
      setStatus('Saved')
      setView({ kind: 'list' })
    } catch {
      setError('Could not save the note')
    }
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
    actions.update(view.id, { body: editBody })
    setStatus('Saved')
  }

  function deleteNote() {
    if (view.kind === 'edit') {
      actions.remove(view.id)
      setView({ kind: 'list' })
      setStatus('Deleted')
    }
    setConfirmDelete(false)
  }

  async function exportMarkdown() {
    if (view.kind !== 'edit') return
    const html = markdownToHtml(editBody)
    const text = stripHtml(html)
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
              <input
                type="password"
                role="searchbox"
                aria-label="Passphrase"
                value={newNote.passphrase}
                onChange={(e) => setNewNote((prev) => ({ ...prev, passphrase: e.target.value }))}
                placeholder="Set a passphrase to encrypt this note"
                className="lc-input"
                style={{
                  width: '100%',
                  fontFamily: 'var(--sans)',
                  fontSize: 'var(--fs-body)',
                  padding: 'calc(8px * var(--sf))',
                border: `calc(1px * var(--sf)) solid var(--line)`,
                  borderRadius: 'var(--r-md)',
                  background: 'var(--panel)',
                  color: 'var(--ink)',
                }}
              />
            </FormGrid>
            <PrimaryButton onClick={() => void saveNote()}>Save note</PrimaryButton>
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
                    meta={new Date(note.updatedAt).toLocaleDateString()}
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
            <input
              type="password"
              role="searchbox"
              aria-label="Passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter passphrase"
              className="lc-input"
              style={{
                width: '100%',
                fontFamily: 'var(--sans)',
                fontSize: 'var(--fs-body)',
                padding: 'calc(8px * var(--sf))',
                border: `calc(1px * var(--sf)) solid var(--line)`,
                borderRadius: 'var(--r-md)',
                background: 'var(--panel)',
                color: 'var(--ink)',
              }}
            />
          </FormGrid>
          {unlocked ? (
            <div
              className="lc-prose"
              style={{
                fontFamily: 'var(--serif)',
                lineHeight: 1.6,
                padding: 'calc(8px * var(--sf))',
                margin: 0,
              }}
              dangerouslySetInnerHTML={{ __html: markdownHtml ?? '' }}
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
          {error && <MonoLabel>{error}</MonoLabel>}
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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent ?? ''
}
