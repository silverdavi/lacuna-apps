// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  MonoLabel,
  Stack,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { bookmarks, type Bookmark } from './host/bookmarks'
import './app.css'

type SortKey = 'title' | 'url' | 'tags' | null
type SortDir = 'asc' | 'desc'

interface Draft {
  title: string
  url: string
  tags: string
}

const EMPTY_DRAFT: Draft = { title: '', url: '', tags: '' }

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function csvText(items: Bookmark[]): string {
  return toCsv([
    ['Title', 'URL', 'Tags'],
    ...items.map((b) => [b.title, b.url, b.tags.join(', ')]),
  ])
}

export function App() {
  const [items, setItems] = useState<Bookmark[]>(() => bookmarks.list())
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [noteToken, setNoteToken] = useState(0)
  const [fieldError, setFieldError] = useState<{ title?: string; url?: string }>({})

  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(''), 3000)
    return () => window.clearTimeout(t)
  }, [note, noteToken])

  const refresh = () => setItems(bookmarks.list())

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered =
      q.length === 0
        ? items
        : items.filter(
            (b) =>
              b.title.toLowerCase().includes(q) ||
              b.url.toLowerCase().includes(q) ||
              b.tags.some((t) => t.toLowerCase().includes(q)),
          )
    if (sortKey === null) return filtered
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va =
        sortKey === 'tags' ? a.tags.join(', ').toLowerCase() : String(a[sortKey]).toLowerCase()
      const vb =
        sortKey === 'tags' ? b.tags.join(', ').toLowerCase() : String(b[sortKey]).toLowerCase()
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [items, search, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const openNewForm = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFormOpen(true)
    setFieldError({})
  }

  const startEdit = (b: Bookmark) => {
    setDraft({ title: b.title, url: b.url, tags: b.tags.join(', ') })
    setEditingId(b.id)
    setFormOpen(true)
    setFieldError({})
  }

  const cancelForm = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFormOpen(false)
    setFieldError({})
  }

  const save = () => {
    const title = draft.title.trim()
    const url = draft.url.trim()
    const nextError: { title?: string; url?: string } = {}
    if (!title) nextError.title = 'Title is required'
    if (!url) nextError.url = 'URL is required'
    if (nextError.title || nextError.url) {
      setFieldError(nextError)
      return
    }
    const patch = { title, url, tags: parseTags(draft.tags) }
    if (editingId) {
      bookmarks.update(editingId, patch)
      setNote('Bookmark updated')
      setNoteToken((n) => n + 1)
      setEditingId(null)
    } else {
      bookmarks.add(patch)
      setNote('Bookmark added')
      setNoteToken((n) => n + 1)
    }
    setDraft(EMPTY_DRAFT)
    setFormOpen(false)
    setFieldError({})
    refresh()
  }

  const remove = (id: string) => {
    bookmarks.remove(id)
    if (editingId === id) {
      setEditingId(null)
      setDraft(EMPTY_DRAFT)
      setFormOpen(false)
    }
    setNote('Bookmark deleted')
    setNoteToken((n) => n + 1)
    refresh()
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportCsv = () => {
    const rows = selected.size > 0 ? items.filter((b) => selected.has(b.id)) : items
    saveText(csvText(rows), { filename: 'bookmarks.csv', mimeType: 'text/csv' })
    setNote(`Exported ${rows.length} ${rows.length === 1 ? 'bookmark' : 'bookmarks'}`)
    setNoteToken((n) => n + 1)
  }

  const header = (key: Exclude<SortKey, null>, label: string) => (
    <button
      type="button"
      className="bm-sort"
      onClick={() => toggleSort(key)}
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      {label}
      {sortKey === key ? (
        <span aria-hidden> {sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
      ) : null}
    </button>
  )

  return (
    <AppShell
      name="Bookmark Manager"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${items.length} ${items.length === 1 ? 'bookmark' : 'bookmarks'}`}
      status={`${visible.length} of ${items.length} ${items.length === 1 ? 'bookmark' : 'bookmarks'} shown`}
      actions={
        <div className="bm-toolbar">
          <Button kind="primary" onClick={openNewForm}>
            Add bookmark
          </Button>
          <Button kind="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      }
    >
      <Stack lg>
        {formOpen && (
          <Card
            mono={editingId ? 'Edit' : 'New'}
            title={editingId ? 'Edit bookmark' : 'New bookmark'}
            actions={
              editingId ? (
                <Button kind="ghost" onClick={cancelForm}>
                  Cancel
                </Button>
              ) : undefined
            }
          >
            <FormGrid>
              <TextInput
                label="Title"
                value={draft.title}
                onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="What is this page?"
                error={fieldError.title}
              />
              <TextInput
                label="URL"
                value={draft.url}
                onChange={(v) => setDraft((d) => ({ ...d, url: v }))}
                placeholder="https://example.com"
                error={fieldError.url}
              />
              <TextInput
                label="Tags"
                value={draft.tags}
                onChange={(v) => setDraft((d) => ({ ...d, tags: v }))}
                placeholder="docs, reading"
              />
            </FormGrid>
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <Actions>
                <Button kind="primary" onClick={save}>
                  Save
                </Button>
                {editingId ? (
                  <Button kind="ghost" onClick={cancelForm}>
                    Cancel
                  </Button>
                ) : null}
              </Actions>
            </div>
          </Card>
        )}

        <Card mono="Find" title="Search">
          <TextInput
            label="Search bookmarks"
            type="search"
            value={search}
            onChange={setSearch}
            placeholder="Title, URL, or tag"
          />
        </Card>

        <Card mono="List" title="Bookmarks">
          {items.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No bookmarks yet"
              detail="Start by adding the first one with the button in the title bar."
              actionLabel="New bookmark"
              onAction={openNewForm}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No matches"
              detail={`No bookmarks match ${search}. ${items.length} ${
                items.length === 1 ? 'bookmark is' : 'bookmarks are'
              } hidden.`}
              actionLabel="Clear search"
              onAction={() => setSearch('')}
            />
          ) : (
            <div className="bm-tablewrap">
              <table className="bm-table">
                <thead>
                  <tr>
                    <th aria-label="Select" scope="col">
                      <input
                        type="checkbox"
                        aria-label="Select all bookmarks"
                        checked={selected.size > 0 && selected.size === visible.length}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? new Set(visible.map((b) => b.id)) : new Set(),
                          )
                        }
                      />
                    </th>
                    <th scope="col">{header('title', 'Title')}</th>
                    <th scope="col">{header('url', 'URL')}</th>
                    <th scope="col">{header('tags', 'Tags')}</th>
                    <th scope="col">
                      <span className="lc-mono-sm">ACTIONS</span>
                    </th>
                  </tr>
                </thead>
            <tbody aria-label="Bookmark rows">
              {visible.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select ${b.title}`}
                          checked={selected.has(b.id)}
                          onChange={() => toggleSelected(b.id)}
                        />
                      </td>
                      <td>{b.title}</td>
                      <td>
                        <span className="bm-url">{b.url}</span>
                      </td>
                      <td>
                        <div className="bm-tags">
                          {b.tags.length > 0 ? (
                            b.tags.map((t) => (
                              <Tag key={t}>{t}</Tag>
                            ))
                          ) : (
                            <span className="lc-body-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="bm-row-actions">
                          <Button kind="ghost" onClick={() => startEdit(b)}>
                            Edit
                          </Button>
                          <Button kind="ghost" onClick={() => remove(b.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {note && (
            <div style={{ marginTop: 'calc(10px * var(--sf))' }} role="status">
              <Tag accent>{note}</Tag>
            </div>
          )}
          {selected.size > 0 && items.length > 0 && (
            <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
              <MonoLabel sm>
                {selected.size} {selected.size === 1 ? 'bookmark' : 'bookmarks'} selected;
                Export CSV downloads the selection
              </MonoLabel>
            </div>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
