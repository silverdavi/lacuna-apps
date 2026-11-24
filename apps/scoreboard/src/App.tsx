// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { filterRecords, sortRecords } from '@lacuna/query-spec'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Table,
  TextInput,
} from '@lacuna/ui'
import { type Entry, loadEntries, saveEntries } from './host/mock'
import './app.css'

type SortDir = 'asc' | 'desc'

export function App() {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntries())
  const [name, setName] = useState('')
  const [score, setScore] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir | null>(null)
  const clipboard = useClipboard()

  const visible = useMemo(() => {
    let rows = entries
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = filterRecords(rows, (e) => e.name.toLowerCase().includes(q))
    }
    if (sortDir) {
      rows = sortRecords(rows, [{ field: 'score', direction: sortDir }])
    }
    return rows
  }, [entries, search, sortDir])

  function persist(next: Entry[]) {
    setEntries(next)
    saveEntries(next)
  }

  function resetForm() {
    setName('')
    setScore('')
    setError(null)
    setEditingId(null)
  }

  function save() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required')
      return
    }
    const parsed = score.trim()
    if (parsed === '' || !Number.isFinite(Number(parsed))) {
      setError('Score is required')
      return
    }
    const value = Number(parsed)
    if (editingId) {
      persist(entries.map((e) => (e.id === editingId ? { ...e, name: trimmedName, score: value } : e)))
    } else {
      persist([...entries, { id: `e-${Date.now()}-${Math.floor(Math.random() * 1e9)}`, name: trimmedName, score: value }])
    }
    resetForm()
  }

  function startEdit(e: Entry) {
    setEditingId(e.id)
    setName(e.name)
    setScore(String(e.score))
    setError(null)
  }

  function remove(e: Entry) {
    persist(entries.filter((x) => x.id !== e.id))
    if (editingId === e.id) resetForm()
  }

  function toggleSort() {
    setSortDir((d) => (d === null ? 'desc' : d === 'desc' ? 'asc' : 'desc'))
  }

  function exportCsv() {
    const rows = visible.length ? visible : entries
    const text = toCsv([
      ['Name', 'Score'],
      ...rows.map((e) => [e.name, String(e.score)]),
    ])
    void clipboard.copy(text)
  }

  const columns = [
    {
      key: 'name',
      label: (
        <button type="button" className="sb-sort" onClick={toggleSort}>
          Name{sortDir === null ? '' : sortDir === 'asc' ? ' ↑' : ' ↓'}
        </button>
      ),
    },
    {
      key: 'score',
      label: (
        <button type="button" className="sb-sort" onClick={toggleSort}>
          Score{sortDir === null ? '' : sortDir === 'asc' ? ' ↑' : ' ↓'}
        </button>
      ),
      num: true,
    },
    { key: 'actions', label: ' ' },
  ]

  const rows = visible.map((e) => ({
    cells: {
      name: e.name,
      score: String(e.score),
      actions: (
        <Actions>
          <Button kind="ghost" onClick={() => startEdit(e)}>
            Edit
          </Button>
          <Button kind="ghost" onClick={() => remove(e)} ariaLabel={`Delete ${e.name}`}>
            Delete
          </Button>
        </Actions>
      ),
    },
  }))

  return (
    <AppShell name="Score Keeper" icon="grid" hue="cobalt" category="Productivity" meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}>
      <Card mono="New" title={editingId ? 'Edit entry' : 'Add entry'}>
        <FormGrid>
          <TextInput label="Name" value={name} onChange={(v) => { setName(v); if (error) setError(null) }} error={error && error.startsWith('Name') ? error : null} />
          <TextInput label="Score" value={score} onChange={(v) => { setScore(v); if (error) setError(null) }} error={error && error.startsWith('Score') ? error : null} inputMode="decimal" />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={save}>
            Save
          </Button>
          {editingId ? (
            <Button kind="secondary" onClick={resetForm}>
              Cancel
            </Button>
          ) : null}
        </Actions>
      </Card>

      <Card mono={`${entries.length} saved`} title="Entries" actions={<Button kind="secondary" onClick={exportCsv}>Export CSV</Button>}>
        <FormGrid>
          <TextInput label="Search" value={search} onChange={setSearch} type="search" placeholder="Filter by name" />
        </FormGrid>
        {entries.length === 0 ? (
          <EmptyState title="No entries yet" detail="Add the first one above." actionLabel="Add an entry" onAction={save} />
        ) : visible.length === 0 ? (
          <EmptyState title="No matches" detail="Try a different search." actionLabel="Clear search" onAction={() => setSearch('')} />
        ) : (
          <Table label="Entries" columns={columns} rows={rows} />
        )}
        {clipboard.copied ? <span className="sb-copied">Copied to clipboard</span> : null}
      </Card>
    </AppShell>
  )
}
