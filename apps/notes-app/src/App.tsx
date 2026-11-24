import { useEffect, useMemo, useRef, useState } from 'react'
import { saveJSON } from '@lacuna/file-save-open'
import { exportBackup } from '@lacuna/json-backup'
import { useCollection } from '@lacuna/use-collection'
import { RecordForm } from '@lacuna/record-form'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
} from '@lacuna/ui'
import { noteStore } from './host'

type Note = { title: string; content: string }

type FormValues = Record<string, string | number>

const NOTE_FIELDS = [
  { name: 'title', label: 'Title', type: 'text' as const, required: true },
  { name: 'content', label: 'Content', type: 'text' as const },
]

export function App() {
  const { state, actions } = useCollection<Note>({ storageKey: 'quick-notes' })
  const [tab, setTab] = useState<'All' | 'Archived'>('All')
  const [query, setQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<FormValues>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    noteStore.replaceAll(
      state.items.map((item) => ({
        id: item.id,
        title: item.data.title,
        content: item.data.content,
        archived: item.archived,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    )
  }, [state.items])

  const source = tab === 'All' ? state.activeItems : state.archivedItems

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return source
    return source.filter(
      (item) =>
        item.data.title.toLowerCase().includes(q) ||
        item.data.content.toLowerCase().includes(q),
    )
  }, [source, query])

  const editing = editingId !== null
  const total = state.items.length
  const initialValues: FormValues = editingId !== null ? (() => {
    const item = state.items.find((entry) => entry.id === editingId)
    return item === undefined
      ? { title: '', content: '' }
      : { title: item.data.title, content: item.data.content }
  })() : { title: '', content: '' }

  function saveNote(values: FormValues) {
    const title = String(values.title ?? '').trim()
    if (!title) {
      setFormError('Type a title first')
      return
    }
    const content = String(values.content ?? '').trim()
    if (editingId !== null) {
      actions.update(editingId, { title, content })
    } else {
      actions.add({ title, content })
    }
    setEditingId(null)
    setFormValues({})
    setFormError(null)
  }

  function startEdit(id: string, title: string, content: string) {
    setEditingId(id)
    setFormValues({ title, content })
    setFormError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setFormValues({})
    setFormError(null)
  }

  function deleteNote(id: string) {
    actions.remove(id)
    if (editingId === id) {
      setEditingId(null)
      setFormValues({})
    }
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
      meta={`${state.activeItems.length} active`}
      status={`${state.activeItems.length} active, ${state.archivedItems.length} archived, ${total} total`}
      side={
        <Rail
          title="Library"
          note={`${total} saved`}
          chips={['Active', `${state.activeItems.length}`, 'Archived', `${state.archivedItems.length}`, 'Search', query.trim() ? 'on' : 'off']}
        />
      }
    >
      <Card mono="Views" title="Views">
        <style>{`.lc-tabs .lc-tab { color: var(--ink-60); }`}</style>
        <div role="tablist" aria-label="Note views" className="lc-tabs" style={{ gap: 'calc(20px * var(--sf))' }}>
          {(['All', 'Archived'] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              id={`quick-notes-tab-${item}`}
              aria-selected={tab === item}
              aria-controls="quick-notes-panels"
              tabIndex={tab === item ? 0 : -1}
              className={'lc-tab' + (tab === item ? ' active' : '')}
              onClick={() => {
                setTab(item)
                setQuery('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault()
                  const next = tab === 'All' ? 'Archived' : 'All'
                  setTab(next)
                }
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </Card>
      <div role="tabpanel" id="quick-notes-panels" aria-labelledby={`quick-notes-tab-${tab}`}>
      <Card
        mono={editing ? 'Edit' : 'New'}
        title={editing ? 'Edit note' : 'New note'}
        accent={editing}
      >
        <RecordForm
          fields={NOTE_FIELDS}
          initialValues={initialValues}
          onSubmit={saveNote}
          onValuesChange={setFormValues}
          submitLabel={editing ? 'Save changes' : 'Save note'}
          cancelLabel={editing ? 'Cancel' : undefined}
          onCancel={cancelEdit}
        />
        {formError !== null && (
          <div role="alert" className="lk-field-error" style={{ marginTop: 'calc(8px * var(--sf))' }}>
            {formError}
          </div>
        )}
      </Card>
      <Card mono={`${total} saved`} title="Library">
        <KpiRow>
          <Kpi value={String(state.activeItems.length)} label="Active" accent />
          <Kpi value={String(state.archivedItems.length)} label="Archived" />
          <Kpi value={String(total)} label="Total" />
        </KpiRow>
      </Card>
      <Card
        mono={`${notes.length} shown`}
        title={tab === 'All' ? 'Notes' : 'Archived'}
        actions={
          <Actions>
            <Button kind="secondary" onClick={exportJson}>
              Export JSON
            </Button>
          </Actions>
        }
      >
        <div style={{ marginBottom: 'calc(12px * var(--sf))' }}>
          <input
            ref={searchInputRef}
            type="search"
            aria-label="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') searchInputRef.current?.blur()
            }}
            placeholder="Search"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              fontFamily: 'var(--sans)',
              fontSize: 'calc(14px * var(--tf))',
              color: 'var(--ink)',
              background: 'var(--paper)',
              border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
              borderRadius: 'calc(4px * var(--sf))',
              padding: 'calc(4px * var(--sf))',
            }}
          />
        </div>
        {notes.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No notes yet"
            detail={
              query.trim()
                ? 'No notes match the search. Clear it or save a new note.'
                : tab === 'All'
                  ? 'Save the first note above.'
                  : 'Archive a note to keep it out of the way.'
            }
            actionLabel="Save a note"
            onAction={() => saveNote({ title: '', content: '' })}
          />
        ) : (
          <div role="list" aria-label={tab === 'All' ? 'Notes' : 'Archived notes'}>
            {notes.map((item) => (
              <div
                key={item.id}
                role="listitem"
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 'calc(12px * var(--sf))',
                  padding: 'calc(8px * var(--sf)) 0',
                  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div className="lk-row-title">{item.data.title}</div>
                  <div className="lk-row-meta">{item.data.content}</div>
                </span>
                <span className="lk-row-value">
                  {new Date(item.updatedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <Actions>
                  {tab === 'All' && !editing && (
                    <Button kind="ghost" onClick={() => startEdit(item.id, item.data.title, item.data.content)}>
                      Edit
                    </Button>
                  )}
                  <Button
                    kind="ghost"
                    onClick={() =>
                      tab === 'All'
                        ? actions.archive(item.id)
                        : actions.unarchive(item.id)
                    }
                  >
                    {tab === 'All' ? 'Archive' : 'Restore'}
                  </Button>
                    <Button kind="danger" onClick={() => deleteNote(item.id)}>
                      Delete {item.data.title}
                    </Button>
                </Actions>
              </div>
            ))}
          </div>
        )}
      </Card>
      </div>
    </AppShell>
  )
}
