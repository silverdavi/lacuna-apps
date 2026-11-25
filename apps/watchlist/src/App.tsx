// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Select,
  TextInput,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { RecordTable } from '@lacuna/record-table'
import { useClipboard } from '@lacuna/use-clipboard'

interface MovieData extends Record<string, unknown> {
  title: string
  type: string
  year: string
  rating: string
  watched: boolean
}

interface MovieRow extends MovieData {
  id: string
}

const TYPES = ['Movie', 'Show']

export function App() {
  const { state, actions } = useCollection<MovieData>({ storageKey: 'lacuna.watchlist' })
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Movie')
  const [year, setYear] = useState('')
  const [rating, setRating] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { copy, copied } = useClipboard()

  const movies: MovieRow[] = useMemo(
    () =>
      state.activeItems.map((item) => ({
        id: item.id,
        title: item.data.title,
        type: item.data.type,
        year: item.data.year,
        rating: item.data.rating,
        watched: item.data.watched,
      })),
    [state.activeItems],
  )

  const filtered = useMemo(() => {
    let result = movies
    if (typeFilter !== '') result = result.filter((m) => m.type === typeFilter)
    const needle = query.trim().toLowerCase()
    if (needle !== '') result = result.filter((m) => m.title.toLowerCase().includes(needle))
    return result
  }, [movies, query, typeFilter])

  function add() {
    const nextTitle = title.trim()
    if (!nextTitle) {
      setError('Type a title first')
      return
    }
    if (movies.some((m) => m.title.toLowerCase() === nextTitle.toLowerCase())) {
      setError('That title is already in the list')
      return
    }
    actions.add({ title: nextTitle, type, year: year.trim(), rating: rating.trim(), watched: false })
    setTitle('')
    setYear('')
    setRating('')
    setError(null)
  }

  function toggleWatched(id: string, watched: boolean) {
    actions.update(id, { watched })
  }

  function exportCsv() {
    const rows = [
      'Title,Type,Year,Rating',
      ...movies.map((m) => `${m.title},${m.type},${m.year},${m.rating}`),
    ]
    void copy(rows.join('\n'))
  }

  return (
    <AppShell
      name="Movie Watchlist"
      icon="tasks"
      hue="gold"
      category="Personal"
      meta={`${movies.length} ${movies.length === 1 ? 'movie' : 'movies'}`}
      status={copied ? 'CSV copied to clipboard' : undefined}
    >
      <Card mono="New" title="Add a movie">
        <FormGrid>
          <TextInput label="Title" value={title} onChange={setTitle} error={error} />
          <Select label="Type" value={type} onChange={setType} options={TYPES} />
          <TextInput label="Year" value={year} onChange={setYear} inputMode="numeric" />
          <TextInput label="Rating" value={rating} onChange={setRating} inputMode="decimal" />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={add}>Add</PrimaryButton>
        </Actions>
      </Card>
      <Card
        mono={typeFilter !== '' || query.trim() !== '' ? `${filtered.length} of ${movies.length}` : `${movies.length} saved`}
        title="Watchlist"
        actions={
          <Button kind="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        }
      >
        {movies.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 'calc(12px * var(--sf))',
              marginBottom: 'calc(12px * var(--sf))',
              alignItems: 'flex-start',
            }}
          >
            <div style={{ flex: 1, maxWidth: 'calc(280px * var(--sf))' }}>
              <TextInput
                label="Search"
                value={query}
                onChange={setQuery}
                placeholder="Search by title"
                type="search"
              />
            </div>
            {movies.length > 1 && (
              <div style={{ width: 'calc(180px * var(--sf))' }}>
                <Select
                  label="Filter by type"
                  value={typeFilter}
                  onChange={setTypeFilter}
                  options={[
                    { value: '', label: 'All' },
                    ...TYPES,
                  ]}
                />
              </div>
            )}
          </div>
        )}
        {filtered.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No movies yet"
            detail="No movies match."
            actionLabel="Use the form above to add one"
          />
        ) : (
          <RecordTable
            records={filtered}
            rowKey={(record) => record.id}
            columns={[
              { key: 'title', header: 'Title' },
              { key: 'type', header: 'Type' },
              { key: 'year', header: 'Year' },
              { key: 'rating', header: 'Rating' },
              {
                key: 'watched',
                header: 'Status',
                formatter: (_value, record) => (record.watched ? 'Watched' : 'Unwatched'),
              },
              {
                key: 'actions',
                header: '',
                formatter: (_value, record) => (
                  <span style={{ display: 'inline-flex', gap: 'calc(8px * var(--sf))' }}>
                    <Button
                      kind="ghost"
                      ariaLabel={`Delete ${record.title}`}
                      onClick={() => actions.remove(record.id)}
                    >
                      Delete
                    </Button>
                    <Button
                      kind="secondary"
                      ariaLabel={record.watched ? 'Undo' : 'Mark watched'}
                      onClick={() => toggleWatched(record.id, !record.watched)}
                    >
                      {record.watched ? 'Undo' : 'Mark watched'}
                    </Button>
                  </span>
                ),
              },
            ]}
            emptyMessage="No movies yet"
            ariaLabel="Movie watchlist"
          />
        )}
      </Card>
    </AppShell>
  )
}
