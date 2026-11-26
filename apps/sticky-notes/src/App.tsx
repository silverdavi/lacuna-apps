import { useState } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { exportBackup } from '@lacuna/json-backup'
import { AppShell, Button, Card, Cols, EmptyState, Rail, Stack, TextInput } from '@lacuna/ui'

const APP_ID = 'lacuna.sticky-notes'

type Note = { text: string }

export function App() {
  const { state, actions } = useCollection<Note>({ storageKey: `${APP_ID}.notes` })
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [copied, setCopied] = useState(false)
  const { copy } = useClipboard()

  const items = state.items
  const notes = items.map((item) => ({ id: item.id, text: item.data.text }))
  const q = query.trim()
  const ql = q.toLowerCase()
  const visible = q === '' ? notes : notes.filter((n) => n.text.toLowerCase().includes(ql))
  const selected = selectedId !== null ? visible.find((n) => n.id === selectedId) ?? notes.find((n) => n.id === selectedId) : undefined
  const editing = editingId !== null ? notes.find((n) => n.id === editingId) : undefined

  const addNote = () => {
    const text = draft.trim()
    if (text === '') return
    actions.add({ text })
    setDraft('')
    setSelectedId(null)
  }

  const saveEdit = () => {
    if (editing === undefined) return
    const text = editText.trim()
    if (text === '') return
    actions.update(editing.id, { text })
    setEditingId(null)
  }

  const onExport = () => {
    const records = items.map((item) => ({
      id: item.id,
      data: item.data,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
    const json = exportBackup({ appId: APP_ID, version: 1, records })
    const execCopy = () => {
      const ta = document.createElement('textarea')
      ta.value = json
      ta.style.position = 'fixed'
      ta.style.width = '0'
      ta.style.height = '0'
      ta.style.overflow = 'hidden'
      ta.style.clip = 'rect(0,0,0,0)'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      let ok = false
      try {
        ok = document.execCommand('copy')
      } catch {
        ok = false
      }
      document.body.removeChild(ta)
      return ok
    }
    const modern = navigator.clipboard?.writeText?.(json)
    const usesModern = modern instanceof Promise
    if (usesModern) {
      modern.catch(() => {
        if (!execCopy()) copy(json).catch(() => undefined)
      })
    } else if (!execCopy()) {
      void copy(json).catch(() => undefined)
    }
    setCopied(true)
  }

  return (
    <AppShell
      name="Sticky Notes"
      icon="notes"
      hue="gold"
      category="Productivity"
      meta={`${items.length} notes`}
      status={copied ? 'Copied to clipboard' : 'Local'}
      side={
        <Rail
          title="Sticky Notes"
          note="Jot, find, reorder, and export"
          chips={[`${items.length} notes`, `Showing ${visible.length}`]}
        >
          <Button kind="secondary" ariaLabel="Export JSON" onClick={onExport}>
            Export JSON
          </Button>
        </Rail>
      }
    >
      <Stack>
        <Cols kind="2">
          <Card>
            <Stack>
              <h2>{editing !== undefined ? 'Edit note' : 'New note'}</h2>
              <TextInput
                label="Note text"
                value={editing !== undefined ? editText : draft}
                onChange={(v) => (editing !== undefined ? setEditText(v) : setDraft(v))}
                placeholder="Jot something down"
              />
              {editing !== undefined ? (
                <Stack>
                  <Button kind="primary" ariaLabel="Save" disabled={editText.trim() === ''} onClick={saveEdit}>
                    Save
                  </Button>
                  <Button
                    kind="ghost"
                    ariaLabel="Cancel edit"
                    onClick={() => {
                      setEditingId(null)
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              ) : (
                <Button kind="primary" ariaLabel="Add note" disabled={draft.trim() === ''} onClick={addNote}>
                  Add note
                </Button>
              )}
            </Stack>
          </Card>
          <Card>
            <Stack>
              <h2>Notes</h2>
              <TextInput label="Search" value={query} onChange={setQuery} placeholder="Find a note" />
              {items.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No notes yet"
                  detail="Add your first note above."
                  actionLabel="Add a note"
                />
              ) : visible.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No matches"
                  detail="Nothing matches the search."
                  actionLabel="Clear the search"
                />
              ) : (
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'grid',
                    gap: 'calc(6px * var(--sf))',
                    height: 'calc(280px * var(--tf))',
                    overflowY: 'auto',
                  }}
                >
                  {visible.map((n, i) => (
                    <li
                      key={n.id}
                      onClick={() => {
                        setSelectedId(n.id)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'calc(8px * var(--sf))',
                        padding: 'calc(8px * var(--sf))',
                        border: `calc(${n.id === selectedId ? 2 : 1}px * var(--sf)) solid var(${
                          n.id === selectedId ? '--accent' : '--ui-line'
                        })`,
                        borderRadius: 'calc(8px * var(--sf))',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0 }}>{n.text}</span>
                      <span style={{ display: 'inline-flex', gap: 'calc(4px * var(--sf))', flexShrink: 0 }}>
                        <Button
                          kind="ghost"
                          ariaLabel="Move up"
                          disabled={i === 0}
                          onClick={() => {
                            actions.reorder(i, i - 1)
                          }}
                          >
                            ↑
                          </Button>
                        <button
                          type="button"
                          className="lc-btn ghost"
                          aria-label="Move down"
                          disabled={i === visible.length - 1}
                          onClick={() => {
                            actions.reorder(i, i + 1)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              actions.reorder(i, i + 1)
                            }
                          }}
                        >
                          ↓
                        </button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Edit ${n.text}`}
                          onClick={() => {
                            setEditingId(n.id)
                            setEditText(n.text)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          kind="danger"
                          ariaLabel={`Delete ${n.text}`}
                          onClick={() => {
                            actions.remove(n.id)
                            if (selectedId === n.id) setSelectedId(null)
                          }}
                        >
                          Delete
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        </Cols>
        <Card>
          <Stack>
            <h2>Selected note</h2>
            {selected !== undefined && selected !== null ? (
              <Stack>
                <span style={{ display: 'block' }}>{selected?.text}</span>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', flex: 1 }}>
                  <Button
                    kind="ghost"
                    ariaLabel="Edit note"
                    onClick={() => {
                      if (selected !== undefined) {
                        setEditingId(selected.id)
                        setEditText(selected.text)
                        setSelectedId(null)
                      }
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    kind="danger"
                    ariaLabel="Delete note"
                    onClick={() => {
                      if (selected !== undefined) {
                        actions.remove(selected.id)
                        setSelectedId(null)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </Stack>
            ) : (
              <EmptyState
                mono="Pick"
                title="No note selected"
                detail="Choose a note above to edit or delete it."
                actionLabel="Pick a note"
              />
            )}
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  )
}
