import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { exportBackup } from '@lacuna/json-backup'
import { saveBlob } from '@lacuna/file-save-open'
import { RecordForm, type FieldDef, type RecordValues } from '@lacuna/record-form'
import { useCollection } from '@lacuna/use-collection'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  PrimaryButton,
  Rail,
  Stack,
} from '@lacuna/ui'
import type { RecipeData } from './host'

type Editing = { mode: 'add' } | { mode: 'edit'; id: string } | null

type Row = RecipeData & { id: string }

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'servings', label: 'Servings', type: 'number', required: true, min: 1 },
  { name: 'notes', label: 'Notes', type: 'text' },
]

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(rows: Row[]): string {
  const lines = ['Name,Servings']
  for (const r of rows) lines.push(`${csvEscape(r.name)},${csvEscape(r.servings)}`)
  return lines.join('\n')
}

function SearchInput({
  records,
  query,
  onQueryChange,
}: {
  records: Row[]
  query: string
  onQueryChange: (q: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const textNode = el.childNodes[0]
    if (textNode && textNode.nodeType === 3 && textNode.textContent !== query) {
      textNode.textContent = query
    }
  }, [query])

  function readText(el: HTMLElement): string {
    let text = ''
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) text += node.textContent ?? ''
    }
    return text
  }

  const matches = query
    ? records.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    : []

  return (
    <div
      ref={ref}
      role="searchbox"
      aria-label="Search"
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => {
        const text = readText(e.currentTarget)
        onQueryChange(text)
      }}
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
        minHeight: 'calc(28px * var(--tf))',
        position: 'relative',
      }}
    >
      {query}
      {query !== '' && (
        <ul
          role="listbox"
          aria-label="Results"
          contentEditable={false}
          style={{
            position: 'absolute',
            top: 'calc(100% + calc(2px * var(--sf)))',
            left: 0,
            right: 0,
            zIndex: 10,
            margin: 0,
            padding: 'calc(4px * var(--sf))',
            listStyle: 'none',
            background: 'var(--paper-deep)',
            color: 'var(--ink)',
            border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
            borderRadius: 'calc(4px * var(--sf))',
            overflow: 'auto',
            maxHeight: 'calc(240px * var(--sf))',
          }}
        >
          {matches.length === 0 ? (
            <li
              style={{
                padding: 'calc(4px * var(--sf))',
                fontFamily: 'var(--sans)',
                fontSize: 'calc(14px * var(--tf))',
                color: 'var(--ink)',
              }}
            >
              No results
            </li>
          ) : (
            matches.map((r) => {
              const idx = r.name.toLowerCase().indexOf(query.toLowerCase())
              let content: React.ReactNode = r.name
              if (idx >= 0) {
                content = (
                  <>
                    {r.name.slice(0, idx)}
                    <mark>{r.name.slice(idx, idx + query.length).toLowerCase()}</mark>
                    {r.name.slice(idx + query.length)}
                  </>
                )
              }
              return (
                <li
                  key={r.id}
                  role="option"
                  style={{
                    padding: 'calc(4px * var(--sf))',
                    borderRadius: 'calc(4px * var(--sf))',
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(14px * var(--tf))',
                    color: 'var(--ink)',
                  }}
                >
                  {content}
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

export function App() {
  const { state, actions } = useCollection<RecipeData>({
    storageKey: 'lacuna.recipe-manager.recipes',
  })

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [editing, setEditing] = useState<Editing>(null)

  const recipes: Row[] = useMemo(
    () => state.items.map((it) => ({ id: it.id, ...it.data })),
    [state.items],
  )

  const visible = useMemo(() => {
    let rows = query
      ? recipes.filter((r) => r.name.toLowerCase().includes(query))
      : recipes
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        if (sortKey === 'servings') {
          const av = parseFloat(a.servings) || 0
          const bv = parseFloat(b.servings) || 0
          return av - bv
        }
        return a.name.localeCompare(b.name)
      })
    }
    return rows
  }, [recipes, query, sortKey])

  const total = recipes.length

  const tableStyle: CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
  }
  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: 'calc(8px * var(--sf))',
    borderBottom: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    background: 'var(--paper-deep)',
    color: 'var(--ink)',
    cursor: 'pointer',
  }
  const tdStyle: CSSProperties = {
    padding: 'calc(8px * var(--sf))',
    borderBottom: 'calc(1px * var(--sf)) solid var(--hair)',
    color: 'var(--ink)',
    textAlign: 'left',
  }
  const emptyCellStyle: CSSProperties = {
    padding: 'calc(16px * var(--sf))',
    color: 'var(--ink)',
    textAlign: 'center',
    fontStyle: 'italic',
  }

  function highlightName(name: string, q: string) {
    const query = q.trim().toLowerCase()
    if (!query) return name
    const idx = name.toLowerCase().indexOf(query)
    if (idx < 0) return name
    return (
      <>
        {name.slice(0, idx)}
        <mark>{name.slice(idx, idx + query.length)}</mark>
        {name.slice(idx + query.length)}
      </>
    )
  }

  function handleFormSubmit(values: RecordValues) {
    const name = String(values.name ?? '').trim()
    const servings = String(values.servings ?? '')
    const notes = String(values.notes ?? '').trim()
    if (editing?.mode === 'edit') {
      actions.update(editing.id, { name, servings, notes, tags: [] })
    } else {
      actions.add({ name, servings, notes, tags: [] })
    }
    setEditing(null)
  }

  const editingRecipe =
    editing?.mode === 'edit' ? recipes.find((r) => r.id === editing.id) : undefined

  const exportCsv = () => {
    saveBlob(new Blob([toCsv(visible)], { type: 'text/csv' }), {
      filename: 'recipes.csv',
      mimeType: 'text/csv',
    })
  }

  const exportJson = () => {
    saveBlob(
      new Blob(
        [
          exportBackup<RecipeData>({
            appId: 'lacuna.recipe-manager',
            version: 1,
            records: state.items.map((it) => ({
              id: it.id,
              data: it.data,
              createdAt: it.createdAt,
              updatedAt: it.updatedAt,
            })),
          }),
        ],
        { type: 'application/json' },
      ),
      { filename: 'recipes.json', mimeType: 'application/json' },
    )
  }

  return (
    <AppShell
      name="Recipe Manager"
      icon="notes"
      hue="gold"
      category="Personal"
      meta={`${total} ${total === 1 ? 'recipe' : 'recipes'}`}
      status=""
      side={
        <Rail
          title="Recipe Manager"
          note="Recipes stay in this browser"
          chips={[`${total} recipes`, 'CSV export', 'JSON backup']}
        >
          <Body>Search, sort and export your recipes.</Body>
        </Rail>
      }
    >
      <Card mono="New" title="Add a recipe">
        {editing?.mode === 'add' ? (
          <RecordForm
            fields={FIELDS}
            submitLabel="Save"
            cancelLabel="Cancel"
            onSubmit={handleFormSubmit}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Stack>
            <Body>Add a recipe with a name, servings and optional notes.</Body>
            <PrimaryButton onClick={() => setEditing({ mode: 'add' })}>
              Add recipe
            </PrimaryButton>
          </Stack>
        )}
      </Card>

      {total > 0 ? (
        <Card mono={`${visible.length} shown`} title="Recipes">
          <Stack>
            <SearchInput records={recipes} query={query} onQueryChange={setQuery} />
            {visible.length === 0 ? (
              <div style={emptyCellStyle}>No results</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={tableStyle} aria-label="Recipes">
                    <thead>
                      <tr>
                        <th
                          style={thStyle}
                          onClick={() =>
                            setSortKey((cur) => (cur === 'name' ? null : 'name'))
                          }
                        >
                          Name
                        </th>
                        <th
                          style={thStyle}
                          onClick={() =>
                            setSortKey((cur) =>
                              cur === 'servings' ? null : 'servings',
                            )
                          }
                        >
                          Servings
                        </th>
                        <th style={{ ...thStyle, width: 0, padding: 0, border: 'none', background: 'transparent' }} />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.id}>
                          <td style={tdStyle}>
                            {highlightName(r.name, query)}
                          </td>
                          <td style={tdStyle}>{r.servings}</td>
                          <td style={{ ...tdStyle, padding: 0, border: 'none' }}>
                            <div
                              style={{
                                display: 'flex',
                                gap: 'calc(4px * var(--sf))',
                              }}
                            >
                              <Button
                                kind="ghost"
                                ariaLabel={`Edit ${r.name}`}
                                onClick={() => setEditing({ mode: 'edit', id: r.id })}
                              >
                                Edit
                              </Button>
                              <Button
                                kind="danger"
                                ariaLabel={`Delete ${r.name}`}
                                onClick={() => actions.remove(r.id)}
                              >
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
          </Stack>
        </Card>
      ) : (
        <Card mono="Empty" title="Recipes">
          <EmptyState
            mono="Empty"
            title="No recipes yet"
            detail="Add the first recipe to get started."
            actionLabel="Add a recipe"
            onAction={() => setEditing({ mode: 'add' })}
          />
        </Card>
      )}

      {total > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 'calc(4px * var(--sf))' }}>
          <Button kind="ghost" ariaLabel="Export CSV" onClick={exportCsv}>
            Export CSV
          </Button>
          <Button kind="ghost" ariaLabel="Export JSON" onClick={exportJson}>
            Export JSON
          </Button>
        </div>
      ) : null}

      {editing?.mode === 'edit' && editingRecipe ? (
        <Card mono="Edit" title={`Edit ${editingRecipe.name}`}>
          <RecordForm
            key={editingRecipe.id}
            fields={FIELDS}
            initialValues={{
              name: editingRecipe.name,
              servings: editingRecipe.servings,
              notes: editingRecipe.notes,
            }}
            submitLabel="Save"
            cancelLabel="Cancel"
            onSubmit={handleFormSubmit}
            onCancel={() => setEditing(null)}
          />
        </Card>
      ) : null}

    </AppShell>
  )
}
