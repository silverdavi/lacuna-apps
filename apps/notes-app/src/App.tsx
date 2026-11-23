// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, TextInput } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { saveJSON } from '@lacuna/file-save-open'
import { exportBackup } from '@lacuna/json-backup'

type Note = { title: string; content: string }

const TABS = ['All', 'Archived'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const { state, actions } = useCollection<Note>({ storageKey: 'quick-notes' })
  const [tab, setTab] = useState<Tab>('All')
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const source = tab === 'All' ? state.activeItems : state.archivedItems

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (item) => item.data.title.toLowerCase().includes(q) || item.data.content.toLowerCase().includes(q),
    )
  }, [source, query])

  function saveNote() {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError('Type a title first')
      return
    }
    actions.add({ title: nextTitle, content: content.trim() })
    setTitle('')
    setContent('')
    setError(null)
  }

  function exportJson() {
    const records = state.items.map((item) => ({
      id: item.id,
      data: item.data,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))
    const json = exportBackup<Note>({ appId: 'quick-notes', version: 1, records })
    saveJSON(json, { filename: 'quick-notes.json', mimeType: 'application/json' })
  }

  return (
    <AppShell
      name="Quick Notes"
      icon="notes"
      hue="gold"
      category="Productivity"
      meta={`${state.activeItems.length} ${state.activeItems.length === 1 ? 'note' : 'notes'}`}
    >
      <Card mono="New" title="New note">
        <FormGrid>
          <TextInput label="Title" value={title} onChange={setTitle} error={error} placeholder="Meeting" />
          <TextInput label="Content" value={content} onChange={setContent} rows={3} placeholder="Discuss Q3 roadmap" />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={saveNote}>Save note</PrimaryButton>
        </Actions>
      </Card>
      <Card
        mono={tab}
        title={tab === 'All' ? 'Notes' : 'Archived'}
        actions={
          <Actions>
            <TextInput label="Search" value={query} onChange={setQuery} type="search" placeholder="Search" />
            <Button kind="secondary" onClick={exportJson}>Export JSON</Button>
          </Actions>
        }
      >
        <div role="tablist" aria-label="Note views">
          {TABS.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              style={{
                font: 'inherit',
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: tab === item ? 'var(--ink)' : 'var(--ink-60)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === item ? 'var(--accent)' : 'transparent'}`,
                margin: '0 calc(12px * var(--sf)) 0 0',
              }}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {notes.length === 0 ? (
          <EmptyState mono="Empty" title="No notes yet" detail="Save a note above or clear the search." actionLabel="Save a note" />
        ) : (
          <List label="Notes">
            {notes.map((item) => (
              <Row
                key={item.id}
                title={item.data.title}
                meta={item.data.content}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Delete ${item.data.title}`}
                    onClick={() => actions.remove(item.id)}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
