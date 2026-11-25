// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
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
  Tag,
  TextInput,
} from '@lacuna/ui'
import { createMockRecordStore } from '@lacuna/host-mock'

export type Dream = {
  id: string
  title: string
  description: string
  tags: string[]
  date: string
}

function todayISO() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isDream(v: unknown): v is Dream {
  if (typeof v !== 'object' || v === null) return false
  const d = v as Record<string, unknown>
  return (
    typeof d.id === 'string' &&
    typeof d.title === 'string' &&
    typeof d.description === 'string' &&
    Array.isArray(d.tags) &&
    (d.tags as unknown[]).every((t) => typeof t === 'string') &&
    typeof d.date === 'string'
  )
}

const dreamStore = createMockRecordStore<Dream>({
  key: 'lacuna.dream-journal.dreams',
  idPrefix: 'dream-',
  validate: isDream,
})

function loadDreams(): Dream[] {
  return dreamStore.list()
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(dreams: Dream[]): string {
  const header = 'title,description,tags,date'
  const rows = dreams.map((d) =>
    [d.title, d.description, d.tags.join('; '), d.date]
      .map(escapeCsv)
      .join(','),
  )
  return [header, ...rows].join('\n')
}

export function App() {
  const [dreams, setDreams] = useState<Dream[]>(loadDreams)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [toast, setToast] = useState<string | null>(null)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const d of dreams) for (const t of d.tags) set.add(t)
    return [...set].sort()
  }, [dreams])

  function resetForm() {
    setTitle('')
    setDescription('')
    setTagsInput('')
    setEditingId(null)
  }

  function saveDream() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const tags = parseTags(tagsInput)
    const desc = description.trim()
    if (editingId) {
      dreamStore.update(editingId, { title: trimmedTitle, description: desc, tags })
    } else {
      dreamStore.add({ title: trimmedTitle, description: desc, tags, date: todayISO() })
    }
    setDreams(dreamStore.list())
    resetForm()
  }

  function editDream(d: Dream) {
    setEditingId(d.id)
    setTitle(d.title)
    setDescription(d.description)
    setTagsInput(d.tags.join(', '))
  }

  function deleteDream(id: string) {
    dreamStore.remove(id)
    setDreams(dreamStore.list())
    if (editingId === id) resetForm()
  }

  function exportCsv() {
    const csv = toCsv(dreams)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dreams.csv'
    a.click()
    URL.revokeObjectURL(url)
    setToast(`Exported ${dreams.length} dream(s) to CSV`)
    window.setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return dreams.filter((d) => {
      if (tagFilter !== 'all' && !d.tags.includes(tagFilter)) return false
      if (q) {
        const haystack = `${d.title} ${d.description}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [dreams, query, tagFilter])

  const emptyMessage =
    dreams.length === 0 ? 'No dreams yet' : filtered.length === 0 ? 'No dreams match' : null

  return (
    <AppShell
      name="Dream Journal"
      icon="notes"
      hue="gold"
      category="Reflection"
      meta={`${dreams.length} ${dreams.length === 1 ? 'dream' : 'dreams'}`}
    >
      <Card
        mono={editingId ? 'Edit' : 'New'}
        title={editingId ? 'Edit dream' : 'Log a dream'}
        actions={
          editingId ? (
            <Button kind="ghost" onClick={resetForm}>
              Cancel
            </Button>
          ) : undefined
        }
      >
        <FormGrid>
          <TextInput label="Title" value={title} onChange={setTitle} placeholder="What was the dream about?" />
          <TextInput label="Description" value={description} onChange={setDescription} placeholder="Details, symbols, how it ended" rows={3} />
          <TextInput label="Tags" value={tagsInput} onChange={setTagsInput} placeholder="comma,separated,tags" />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={saveDream}>Save dream</PrimaryButton>
        </Actions>
      </Card>
      <Card mono={`${filtered.length} shown`} title="Your dreams">
        <FormGrid>
          <TextInput label="Search" value={query} onChange={setQuery} placeholder="Search titles and descriptions" />
          <select className="lc-input" id="tag-filter" aria-label="Tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="all">All</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormGrid>
        {emptyMessage ? (
          <EmptyState
            mono="Empty"
            title={emptyMessage}
            detail={dreams.length === 0 ? 'Log your first dream above.' : 'Try clearing the search or tag filter.'}
            actionLabel={dreams.length === 0 ? 'Log a dream' : 'Clear filters'}
            onAction={
              dreams.length === 0
                ? () => document.getElementById('dream-title')?.focus()
                : () => {
                    setQuery('')
                    setTagFilter('all')
                  }
            }
          />
        ) : (
          <List label="Dreams">
            {filtered.map((d) => (
              <Row
                key={d.id}
                title={d.title}
                meta={
                  <span>
                    {d.description}
                    {d.tags.length > 0 ? (
                      <span style={{ display: 'inline-flex', gap: 'calc(4px * var(--sf))', marginLeft: 'calc(8px * var(--sf))' }}>
                        {d.tags.map((t) => (
                          <Tag key={t}>{t}</Tag>
                        ))}
                      </span>
                    ) : null}
                  </span>
                }
                action={
                  <span style={{ display: 'inline-flex', gap: 'calc(8px * var(--sf))' }}>
                    <Button kind="ghost" ariaLabel={`Edit ${d.title}`} onClick={() => editDream(d)}>
                      Edit
                    </Button>
                    <Button kind="ghost" ariaLabel={`Delete ${d.title}`} onClick={() => deleteDream(d.id)}>
                      Delete
                    </Button>
                  </span>
                }
              />
            ))}
          </List>
        )}
        <Actions>
          <Button kind="secondary" onClick={exportCsv} disabled={dreams.length === 0}>
            Export CSV
          </Button>
        </Actions>
      </Card>
      {toast ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(16px * var(--sf))',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
            border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
            borderRadius: 'calc(2px * var(--sf))',
            background: 'var(--ui-card)',
            color: 'var(--ink)',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(13px * var(--tf))',
            zIndex: 10,
          }}
        >
          {toast}
        </div>
      ) : null}
    </AppShell>
  )
}
