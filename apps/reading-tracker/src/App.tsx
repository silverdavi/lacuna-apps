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
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { filterRecords, sortRecords } from '@lacuna/query-spec'

interface Book {
  title: string
  author: string
  status: string
  rating: string
}

const STORAGE_KEY = 'lacuna.reading-tracker.books'

const STATUSES = ['To Read', 'Reading', 'Read', 'Dropped']

export function App() {
  const { state, actions } = useCollection<Book>({ storageKey: STORAGE_KEY })
  const books = state.items.map((item) => ({ id: item.id, ...item.data }))

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [status, setStatus] = useState('To Read')
  const [rating, setRating] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortAsc, setSortAsc] = useState(true)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editStatus, setEditStatus] = useState('To Read')
  const [editRating, setEditRating] = useState('')

  const onAdd = () => {
    const t = title.trim()
    const a = author.trim()
    const r = rating.trim()
    if (!t || !a) {
      setError('Enter a title and an author')
      return
    }
    if (r !== '' && !/^\d$/.test(r)) {
      setError('Rating must be a single digit from 0 to 9')
      return
    }
    setError(null)
    actions.add({ title: t, author: a, status, rating: r })
    setTitle('')
    setAuthor('')
    setStatus('To Read')
    setRating('')
  }

  const startEdit = (book: Book & { id: string }) => {
    setEditingId(book.id)
    setEditTitle(book.title)
    setEditAuthor(book.author)
    setEditStatus(book.status)
    setEditRating(book.rating)
  }

  const onSaveEdit = () => {
    if (editingId === null) return
    const t = editTitle.trim()
    const a = editAuthor.trim()
    if (!t || !a) return
    const r = editRating.trim()
    actions.update(editingId, { title: t, author: a, status: editStatus, rating: r })
    setEditingId(null)
  }

  const onDelete = (id: string) => {
    actions.remove(id)
  }

  const onExport = () => {
    const header = ['Title', 'Author', 'Status', 'Rating']
    const rows = visible.map((b) => [b.title, b.author, b.status, b.rating])
    const csv = toCsv([header, ...rows])
    saveText(csv, { filename: 'reading-tracker.csv', mimeType: 'text/csv' })
  }

  const visible = useMemo(() => {
    let items = books
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      )
    }
    if (statusFilter !== 'All') {
      items = filterRecords(items, (b) => b.status === statusFilter)
    }
    return sortRecords(
      items,
      [{ field: 'title', direction: sortAsc ? 'asc' : 'desc' }],
    )
  }, [books, search, statusFilter, sortAsc])

  const onSort = () => {
    setSortAsc((prev) => !prev)
  }

  const sortArrow = sortAsc ? ' \u2191' : ' \u2193'

  const hasBooks = books.length > 0

  return (
    <AppShell
      name="Reading Tracker"
      icon="docs"
      hue="rust"
      category="Productivity"
      meta={`${books.length} ${books.length === 1 ? 'book' : 'books'}`}
    >
      {editingId === null ? (
        <Card mono="New" title="Add a book">
          <FormGrid>
            <TextInput label="Title" value={title} onChange={setTitle} error={error} placeholder="The Hobbit" />
            <TextInput label="Author" value={author} onChange={setAuthor} placeholder="J. R. R. Tolkien" />
            <Select label="Status" value={status} onChange={setStatus} options={STATUSES} />
            <TextInput label="Rating" value={rating} onChange={setRating} type="number" inputMode="numeric" placeholder="0–9" />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={onAdd}>Add book</Button>
          </Actions>
        </Card>
      ) : null}

      {editingId !== null ? (
        <Card mono="Edit" title={`Edit book`}>
          <FormGrid>
            <TextInput label="Title" value={editTitle} onChange={setEditTitle} />
            <TextInput label="Author" value={editAuthor} onChange={setEditAuthor} />
            <Select label="Status" value={editStatus} onChange={setEditStatus} options={STATUSES} />
            <TextInput label="Rating" value={editRating} onChange={setEditRating} type="number" inputMode="numeric" />
          </FormGrid>
          <Actions>
            <Button kind="primary" onClick={onSaveEdit}>Save</Button>
            <Button kind="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
          </Actions>
        </Card>
      ) : null}

      <Card mono={`${visible.length} shown`} title="Books">
        <FormGrid>
          <TextInput label="Search" value={search} onChange={setSearch} type="search" placeholder="Search by title or author" />
          {books.length >= 2 ? (
            <Select label="Status filter" value={statusFilter} onChange={setStatusFilter} options={['All', ...STATUSES]} />
          ) : null}
        </FormGrid>
        {!hasBooks ? (
          <EmptyState mono="Empty" title="No books yet" detail="Add your first book above." actionLabel="Add a book" onAction={onAdd} />
        ) : (
          <Table
            label="Books"
            columns={[
              {
                key: 'title',
                label: (
                  <button type="button" onClick={onSort}>
                    Title{sortArrow}
                  </button>
                ),
              },
              { key: 'author', label: 'Author' },
              { key: 'status', label: 'Status' },
              { key: 'rating', label: 'Rating', num: true },
              { key: 'actions', label: '' },
            ]}
            rows={visible.map((b) => ({
              cells: {
                title: b.title,
                author: b.author,
                status: b.status,
                rating: b.rating,
                actions: (
                  <>
                    <Button kind="ghost" ariaLabel={`Edit ${b.title}`} onClick={() => startEdit(b)}>Edit</Button>
                    <Button kind="ghost" ariaLabel={`Delete ${b.title}`} onClick={() => onDelete(b.id)}>Delete</Button>
                  </>
                ),
              },
            }))}
            empty="No matching books"
          />
        )}
        {hasBooks ? (
          <Actions>
            <Button kind="secondary" onClick={onExport}>Export CSV</Button>
          </Actions>
        ) : null}
      </Card>
    </AppShell>
  )
}
