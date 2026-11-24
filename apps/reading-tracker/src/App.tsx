import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Rail,
  SectionLabel,
  Select,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'

type Status = 'To Read' | 'Reading' | 'Read'
type SortDir = 'asc' | 'desc'
type View = 'Books' | 'Stats'
type SortKey = 'title' | 'author' | 'status' | 'rating'

interface Book {
  title: string
  author: string
  status: Status
  rating: number | null
}

const STATUSES: Status[] = ['To Read', 'Reading', 'Read']
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s }))
const FILTER_OPTIONS = [{ value: 'all', label: 'All' }, ...STATUS_OPTIONS]

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function parseRating(raw: string): number | null {
  const value = raw.trim()
  if (value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function App() {
  const { state, actions } = useCollection<Book>({ storageKey: 'reading-tracker/books' })
  const books = state.activeItems.map((item) => item.data)
  const bookId = (index: number) => state.activeItems[index].id

  const [view, setView] = useState<View>('Books')

  const [draftTitle, setDraftTitle] = useState('')
  const [draftAuthor, setDraftAuthor] = useState('')
  const [draftStatus, setDraftStatus] = useState<Status>('To Read')
  const [draftRating, setDraftRating] = useState('')

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editStatus, setEditStatus] = useState<Status>('To Read')
  const [editRating, setEditRating] = useState('')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const editingBook = editingIndex != null ? books[editingIndex] ?? null : null
  const editingItemId = editingIndex != null ? bookId(editingIndex) : null

  const parsedRating = parseRating(draftRating)
  const addInvalid = !draftTitle.trim() || !draftAuthor.trim() || parsedRating === null

  const visibleBooks = useMemo(() => {
    const q = normalize(query)
    const filtered = books.filter((b) => {
      const matchesQuery = q === '' || normalize(b.title).includes(q) || normalize(b.author).includes(q)
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter
      return matchesQuery && matchesStatus
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return cmp * dir
    })
  }, [books, query, statusFilter, sortKey, sortDir])

  function addBook() {
    if (addInvalid) return
    actions.add({
      title: draftTitle.trim(),
      author: draftAuthor.trim(),
      status: draftStatus,
      rating: parsedRating,
    })
    setDraftTitle('')
    setDraftAuthor('')
    setDraftStatus('To Read')
    setDraftRating('')
  }

  function startEdit(index: number) {
    const book = books[index]
    if (!book) return
    setEditingIndex(index)
    setEditTitle(book.title)
    setEditAuthor(book.author)
    setEditStatus(book.status)
    setEditRating(book.rating == null ? '' : String(book.rating))
  }

  function saveEdit() {
    const rating = parseRating(editRating)
    const title = editTitle.trim()
    const author = editAuthor.trim()
    if (editingItemId == null || title === '' || author === '') return
    actions.update(editingItemId, { title, author, status: editStatus, rating })
    setEditingIndex(null)
    setEditTitle('')
    setEditAuthor('')
    setEditStatus('To Read')
    setEditRating('')
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditTitle('')
    setEditAuthor('')
    setEditStatus('To Read')
    setEditRating('')
  }

  function deleteBook(index: number) {
    const book = books[index]
    if (!book) return
    actions.remove(bookId(index))
    if (editingIndex === index) cancelEdit()
  }

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function exportCsv() {
    const rows: string[][] = [
      ['title', 'author', 'status', 'rating'],
      ...books.map((b) => [b.title, b.author, b.status, b.rating == null ? '' : String(b.rating)]),
    ]
    saveText(toCsv(rows), { filename: 'reading-tracker.csv', mimeType: 'text/csv' })
  }

  const readCount = books.filter((b) => b.status === 'Read').length
  const readingCount = books.filter((b) => b.status === 'Reading').length
  const toReadCount = books.filter((b) => b.status === 'To Read').length
  const rated = books.filter((b) => b.rating != null)
  const avgRating = rated.length > 0 ? (rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length).toFixed(1) : '—'

  const sortArrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')
  const columns: { key: string; label: React.ReactNode; num?: boolean }[] = [
    {
      key: 'title',
      label: (
        <button type="button" className="rt-sort" onClick={() => toggleSort('title')}>
          Title{sortArrow('title')}
        </button>
      ),
    },
    {
      key: 'author',
      label: (
        <button type="button" className="rt-sort" onClick={() => toggleSort('author')}>
          Author{sortArrow('author')}
        </button>
      ),
    },
    {
      key: 'status',
      label: (
        <button type="button" className="rt-sort" onClick={() => toggleSort('status')}>
          Status{sortArrow('status')}
        </button>
      ),
    },
    {
      key: 'rating',
      num: true,
      label: (
        <button type="button" className="rt-sort" onClick={() => toggleSort('rating')}>
          Rating{sortArrow('rating')}
        </button>
      ),
    },
    { key: 'actions', label: '' },
  ]

  const rows = visibleBooks.map((b, i) => ({
    cells: {
      title: b.title,
      author: b.author,
      status: b.status,
                rating: b.rating == null ? <Tag>Unrated</Tag> : String(b.rating),
      actions: (
        <span className="rt-row-actions">
          <Button kind="ghost" onClick={() => startEdit(i)}>
            Edit {b.title}
          </Button>
          <Button kind="danger" onClick={() => deleteBook(i)}>
            Delete {b.title}
          </Button>
        </span>
      ),
    },
  }))

  return (
    <AppShell
      name="Reading Tracker"
      icon="docs"
      hue="gold"
      category="Productivity"
      meta={`${books.length} book${books.length === 1 ? '' : 's'}`}
      side={
        <Rail title="Library">
          <KpiRow>
            <Kpi value={books.length} label="Books" />
            <Kpi value={readCount} label="Read" />
            <Kpi value={avgRating} label="Avg rating" accent />
          </KpiRow>
        </Rail>
      }
    >
      <Actions>
        <Button kind={view === 'Books' ? 'primary' : 'secondary'} onClick={() => setView('Books')}>
          Books
        </Button>
        <Button kind={view === 'Stats' ? 'primary' : 'secondary'} onClick={() => setView('Stats')}>
          Stats
        </Button>
      </Actions>

      {view === 'Books' ? (
        <>
          <Card mono="Library" title="Books">
            <FormGrid>
              <TextInput label="Search" type="search" value={query} onChange={setQuery} />
              {books.length > 0 && !editingBook && draftTitle === '' && draftAuthor === '' && (
                <Select label="Status filter" value={statusFilter} onChange={setStatusFilter} options={FILTER_OPTIONS} />
              )}
              <Button kind="secondary" onClick={exportCsv} disabled={books.length === 0}>
                Export CSV
              </Button>
            </FormGrid>
            <Table columns={columns} rows={rows} label="Books" empty="No books yet" />
          </Card>

          {!editingBook && (
            <Card mono="Add" title="Add a book">
              <FormGrid>
                <TextInput label="Title" value={draftTitle} onChange={setDraftTitle} />
                <TextInput label="Author" value={draftAuthor} onChange={setDraftAuthor} />
                <Select label="Status" value={draftStatus} onChange={(v) => setDraftStatus(v as Status)} options={STATUS_OPTIONS} />
                <TextInput label="Rating" type="number" inputMode="decimal" value={draftRating} onChange={setDraftRating} />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={addBook} disabled={addInvalid}>
                  Add book
                </PrimaryButton>
              </Actions>
            </Card>
          )}

          {editingBook && (
            <Card mono="Edit" title={`Edit ${editingBook.title}`} accent>
              <FormGrid>
                <TextInput label="Title" value={editTitle} onChange={setEditTitle} />
                <TextInput label="Author" value={editAuthor} onChange={setEditAuthor} />
                <Select label="Status" value={editStatus} onChange={(v) => setEditStatus(v as Status)} options={STATUS_OPTIONS} />
                <TextInput label="Rating" type="number" inputMode="decimal" value={editRating} onChange={setEditRating} />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
                <Button kind="ghost" onClick={cancelEdit}>
                  Cancel
                </Button>
              </Actions>
            </Card>
          )}

        </>
      ) : (
        <Card mono="Stats" title="Your library at a glance">
          <KpiRow>
            <Kpi value={books.length} label="Books" />
            <Kpi value={readCount} label="Read" accent />
            <Kpi value={readingCount} label="Reading" />
            <Kpi value={toReadCount} label="To read" />
            <Kpi value={avgRating} label="Avg rating" />
          </KpiRow>
          <SectionLabel>By status</SectionLabel>
          {STATUSES.map((s) => (
            <div key={s} className="lc-stat-row">
              <span className="rt-stat-key">{s}</span>
              <span className="lc-mono">{books.filter((b) => b.status === s).length}</span>
            </div>
          ))}
        </Card>
      )}
    </AppShell>
  )
}
