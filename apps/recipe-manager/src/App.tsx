import { useMemo, useState } from 'react'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useCollection } from '@lacuna/use-collection'
import {
  AppShell,
  Body,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Rail,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { exportBackup } from '@lacuna/json-backup'
import type { RecipeData } from './host'

type Editing =
  | { mode: 'add' }
  | { mode: 'edit'; id: string }
  | null

type Row = RecipeData & { id: string }

function toCsv(rows: RecipeData[]): string {
  const lines = ['Name,Servings']
  for (const r of rows) {
    const name = r.name.includes(',') ? `"${r.name.replace(/"/g, '""')}"` : r.name
    const servings = r.servings.includes(',') ? `"${r.servings.replace(/"/g, '""')}"` : r.servings
    lines.push(`${name},${servings}`)
  }
  return lines.join('\n')
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function RecipeForm({
  initialName,
  initialServings,
  initialNotes,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialName: string
  initialServings: string
  initialNotes: string
  submitLabel: string
  onSubmit: (name: string, servings: string, notes: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [servings, setServings] = useState(initialServings)
  const [notes, setNotes] = useState(initialNotes)
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const n = name.trim()
    const s = servings.trim()
    if (!n) {
      setError('Name is required')
      return
    }
    if (!s) {
      setError('Servings is required')
      return
    }
    setError(null)
    onSubmit(n, s, notes.trim())
  }

  return (
    <Stack>
      <FormGrid>
        <TextInput label="Name" value={name} onChange={setName} error={error} placeholder="Pancakes" />
        <TextInput label="Servings" value={servings} onChange={setServings} inputMode="decimal" placeholder="4" />
        <TextInput label="Notes" value={notes} onChange={setNotes} rows={3} placeholder="Steps, ingredients, tips" />
      </FormGrid>
      <Stack>
        <PrimaryButton onClick={submit}>{submitLabel}</PrimaryButton>
        <Button kind="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  )
}

export function App() {
  const { state, actions } = useCollection<RecipeData>({
    storageKey: 'lacuna.recipe-manager.recipes',
  })

  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<'name' | 'servings'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editing, setEditing] = useState<Editing>(null)

  const recipes: Row[] = state.items.map((it) => ({ id: it.id, ...it.data }))

  const visible = useMemo(() => {
    let rows = recipes
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      rows = rows.filter((r) => r.name.toLowerCase().includes(q))
    }
    const dir = sortDir === 'asc' ? 1 : -1
    rows = [...rows].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name) * dir
      const av = parseFloat(a.servings) || 0
      const bv = parseFloat(b.servings) || 0
      return (av - bv) * dir
    })
    return rows
  }, [recipes, query, sortKey, sortDir])

  const total = recipes.length

  function addRecipe(name: string, servings: string, notes: string) {
    actions.add({ name, servings, notes, tags: [] })
    setEditing(null)
  }

  function updateRecipe(id: string, name: string, servings: string, notes: string) {
    const existing = state.items.find((r) => r.id === id)
    actions.update(id, {
      name,
      servings,
      notes,
      tags: existing ? existing.data.tags : [],
    })
    setEditing(null)
  }

  function exportCsv() {
    const csv = toCsv(recipes)
    downloadBlob(new Blob([csv], { type: 'text/csv' }), 'recipes.csv')
  }

  function exportOptions(): ExportOption[] {
    return [
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => toCsv(recipes),
      },
      {
        id: 'json',
        label: 'JSON backup',
        mimeType: 'application/json',
        extension: 'json',
        getData: () =>
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
      },
    ]
  }

  const editingRecipe =
    editing && editing.mode === 'edit' ? recipes.find((r) => r.id === editing.id) : undefined

  const activeQuery = query.trim().toLowerCase()

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
        {editing && editing.mode === 'add' ? (
          <RecipeForm
            initialName=""
            initialServings=""
            initialNotes=""
            submitLabel="Save"
            onSubmit={addRecipe}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <Stack>
            <Body>Add a recipe with a name, servings and optional notes.</Body>
            <Button kind="secondary" onClick={() => setEditing({ mode: 'add' })}>
              Add recipe
            </Button>
          </Stack>
        )}
      </Card>

      <Card mono={`${visible.length} shown`} title="Recipes">
        <Stack>
          {editing === null ? (
            <TextInput
              label="Search"
              type="text"
              value={query}
              onChange={setQuery}
              placeholder="Filter by name"
            />
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            {total === 0 ? (
              <EmptyState
                mono="Empty"
                title="No recipes yet"
                detail="Add the first recipe to get started."
                actionLabel="Add a recipe"
                onAction={() => setEditing({ mode: 'add' })}
              />
            ) : (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
                  <table style={{ borderCollapse: 'collapse', flex: '1 1 0%', minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: 'left',
                            padding: 'calc(8px * var(--sf))',
                            fontFamily: 'var(--mono)',
                            fontSize: 'calc(11px * var(--tf))',
                            textTransform: 'uppercase',
                            color: 'var(--ink-60)',
                            borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (sortKey === 'name')
                              setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                            else {
                              setSortKey('name')
                              setSortDir('asc')
                            }
                          }}
                        >
                          <span>Name</span>
                          {sortKey === 'name' ? (
                            <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                          ) : null}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => {
                        const isMatch = activeQuery !== '' && r.name.toLowerCase().includes(activeQuery)
                        return (
                          <tr
                            key={r.id}
                            aria-current={isMatch ? 'true' : undefined}
                            data-highlight={isMatch ? 'true' : undefined}
                            style={isMatch ? { backgroundColor: 'var(--accent-soft)', fontWeight: 'bold' } : undefined}
                          >
                            <td
                              className={isMatch ? 'highlight' : undefined}
                              aria-current={isMatch ? 'true' : undefined}
                              style={{
                                padding: 'calc(8px * var(--sf))',
                                borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                                fontFamily: 'var(--serif)',
                                fontSize: 'calc(14px * var(--tf))',
                                ...(isMatch ? { backgroundColor: 'var(--accent-soft)', fontWeight: 'bold' } : {}),
                              }}
                            >
                              {r.name}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div
                      style={{
                        textAlign: 'left',
                        padding: 'calc(8px * var(--sf))',
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(11px * var(--tf))',
                        textTransform: 'uppercase',
                        color: 'var(--ink-60)',
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                        cursor: 'pointer',
                        width: 'calc(80px * var(--sf))',
                      }}
                      onClick={() => {
                        if (sortKey === 'servings')
                          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
                        else {
                          setSortKey('servings')
                          setSortDir('asc')
                        }
                      }}
                    >
                      <span>Servings</span>
                      {sortKey === 'servings' ? (
                        <span aria-hidden="true">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                      ) : null}
                    </div>
                    {visible.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                          fontFamily: 'var(--mono)',
                          color: 'var(--ink-80)',
                          width: 'calc(80px * var(--sf))',
                          boxSizing: 'border-box',
                        }}
                      >
                        {r.servings}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div
                      style={{
                        textAlign: 'left',
                        padding: 'calc(8px * var(--sf))',
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(11px * var(--tf))',
                        textTransform: 'uppercase',
                        color: 'var(--ink-60)',
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                        width: 'calc(160px * var(--sf))',
                      }}
                    >
                      <span>Actions</span>
                    </div>
                    {visible.map((r) => (
                      <div
                        key={r.id}
                        style={{
                          padding: 'calc(8px * var(--sf))',
                          borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                          width: 'calc(160px * var(--sf))',
                          boxSizing: 'border-box',
                        }}
                      >
                        <Stack style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
                          <Button kind="ghost" ariaLabel={`Edit ${r.name}`} onClick={() => setEditing({ mode: 'edit', id: r.id })}>
                            Edit
                          </Button>
                          <Button kind="danger" ariaLabel={`Delete ${r.name}`} onClick={() => actions.remove(r.id)}>
                            Delete
                          </Button>
                        </Stack>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Stack style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <Button kind="secondary" ariaLabel="Export CSV" onClick={exportCsv}>
              Export CSV
            </Button>
            {total > 0 ? (
              <ExportMenu options={exportOptions()} fileName="recipes" ariaLabel="More exports" />
            ) : null}
          </Stack>
        </Stack>
      </Card>

      {editing && editing.mode === 'edit' && editingRecipe ? (
        <Card mono="Edit" title={`Edit ${editingRecipe.name}`}>
          <RecipeForm
            initialName={editingRecipe.name}
            initialServings={editingRecipe.servings}
            initialNotes={editingRecipe.notes}
            submitLabel="Save"
            onSubmit={(name, servings, notes) => updateRecipe(editing.id, name, servings, notes)}
            onCancel={() => setEditing(null)}
          />
        </Card>
      ) : null}

    </AppShell>
  )
}
