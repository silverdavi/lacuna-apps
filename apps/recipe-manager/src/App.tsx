import { useMemo, useState } from 'react'
import { exportBackup, importBackup, type BackupRecord } from '@lacuna/json-backup'
import { openFile, saveText } from '@lacuna/file-save-open'
import { RecordForm, type FieldDef } from '@lacuna/record-form'
import { TagInput } from '@lacuna/tag-input'
import { useCollection } from '@lacuna/use-collection'
import { AppShell, Card, EmptyState, MonoLabel, PrimaryButton, Rail, Stack } from '@lacuna/ui'
import { ExportCsvButton } from './components/ExportCsvButton'
import { RecipeSearch } from './components/RecipeSearch'
import { RecipeTable } from './components/RecipeTable'
import type { Recipe, RecipeData } from './host'

type Editing = { mode: 'add' } | { mode: 'edit'; id: string } | null

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'servings', label: 'Servings', type: 'number', required: true, min: 1 },
  { name: 'notes', label: 'Notes', type: 'text' },
]

const TAG_SUGGESTIONS = [
  'breakfast',
  'dinner',
  'lunch',
  'quick',
  'vegetarian',
  'meal-prep',
  'comfort-food',
  'soup',
]

function validRecipeData(v: unknown): v is RecipeData {
  const r = v as Partial<RecipeData> | null
  if (!r) return false
  return (
    typeof r.name === 'string' &&
    r.name.trim() !== '' &&
    typeof r.servings === 'string' &&
    r.servings.trim() !== '' &&
    typeof r.notes === 'string' &&
    Array.isArray(r.tags)
  )
}

export function App() {
  const { state, actions } = useCollection<RecipeData>({
    storageKey: 'lacuna.recipe-manager.recipes',
  })

  const [query, setQuery] = useState('')
  const [sortKeys, setSortKeys] = useState<string[]>([])
  const [editing, setEditing] = useState<Editing>(null)
  const [tags, setTags] = useState<string[]>([])
  const [importNote, setImportNote] = useState<string | null>(null)

  const recipes: Recipe[] = useMemo(
    () => state.items.map((it) => ({ id: it.id, ...it.data })),
    [state.items],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.notes.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [recipes, query])

  const total = recipes.length
  const shown = visible.length

  const editingRecipe =
    editing?.mode === 'edit' ? recipes.find((r) => r.id === editing.id) : undefined

  function openForm(mode: 'add' | 'edit', id?: string) {
    setTags([])
    if (mode === 'edit' && id) {
      const r = recipes.find((x) => x.id === id)
      if (r) setTags(r.tags)
    }
    setEditing(mode === 'edit' && id ? { mode: 'edit', id } : { mode: 'add' })
    setImportNote(null)
  }

  function closeForm() {
    setEditing(null)
  }

  function handleFormSubmit(values: Record<string, string | number>) {
    const name = String(values.name ?? '').trim()
    const servings = String(values.servings ?? '')
    const notes = String(values.notes ?? '').trim()
    if (editing?.mode === 'edit') {
      actions.update(editing.id, { name, servings, notes, tags })
    } else {
      actions.add({ name, servings, notes, tags })
    }
    closeForm()
  }

  function handleDelete(id: string) {
    actions.remove(id)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void (async () => {
      const res = await openFile(file, 'text')
      if (!res.ok) {
        setImportNote(`Import failed: ${res.error}`)
        return
      }
      try {
        const result = importBackup<RecipeData>(res.data as string, {
          currentVersion: 1,
          validate: (rec: BackupRecord<RecipeData>) =>
            validRecipeData(rec.data) ? null : 'invalid recipe',
        })
        for (const rec of result.records) {
          actions.add(rec.data)
        }
        const n = result.records.length
        setImportNote(
          result.droppedCount > 0
            ? `Imported ${n} recipe${n === 1 ? '' : 's'}, dropped ${result.droppedCount} invalid.`
            : `Imported ${n} recipe${n === 1 ? '' : 's'}.`,
        )
      } catch (err) {
        setImportNote(`Import failed: ${err instanceof Error ? err.message : 'bad file'}`)
      }
    })()
  }

  function handleExportJson() {
    const json = exportBackup<RecipeData>({
      appId: 'lacuna.recipe-manager',
      version: 1,
      records: state.items.map((it) => ({
        id: it.id,
        data: it.data,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      })),
    })
    saveText(json, { filename: 'recipes.json', mimeType: 'application/json' })
  }

  const empty = total === 0

  return (
    <AppShell
      name="Recipe Manager"
      icon="notes"
      hue="gold"
      category="Personal"
      meta={`${total} ${total === 1 ? 'recipe' : 'recipes'}`}
      side={
        <Rail
          title="Your kitchen"
          note="Everything stays in this browser."
          chips={[`${total} recipes`, 'CSV export', 'JSON backup']}
        />
      }
    >
      <Card
        mono="New"
        title={editing?.mode === 'edit' ? `Edit ${editingRecipe?.name ?? ''}` : 'Add a recipe'}
      >
        {editing ? (
          <Stack>
            <RecordForm
              key={editing.mode === 'edit' ? editing.id : 'add'}
              fields={FIELDS}
              initialValues={
                editingRecipe
                  ? {
                      name: editingRecipe.name,
                      servings: editingRecipe.servings,
                      notes: editingRecipe.notes,
                    }
                  : undefined
              }
              submitLabel="Save"
              cancelLabel="Cancel"
              onCancel={closeForm}
              onSubmit={handleFormSubmit}
            />
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={TAG_SUGGESTIONS}
              placeholder="Add a tag, press Enter"
              aria-label="Recipe tags"
            />
          </Stack>
        ) : (
          <Stack>
            <PrimaryButton onClick={() => openForm('add')}>Add recipe</PrimaryButton>
          </Stack>
        )}
      </Card>

      <Card
        mono={`${shown} of ${total}`}
        title="Recipes"
      >
        {empty ? (
          <EmptyState
            mono="Empty"
            title="No recipes yet"
            detail="Add the first recipe to get started."
            actionLabel="Add a recipe"
            onAction={() => openForm('add')}
          />
        ) : (
          <Stack>
            <RecipeSearch
              value={query}
              onChange={setQuery}
              resultCount={shown}
              totalCount={total}
            />
            {importNote ? <MonoLabel>{importNote}</MonoLabel> : null}
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
              <ExportCsvButton recipes={visible} />
              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(13px * var(--tf))',
                  color: 'var(--ink)',
                  background: 'transparent',
                  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                  borderRadius: 'calc(4px * var(--sf))',
                  padding: 'calc(6px * var(--sf)) calc(10px * var(--sf))',
                  cursor: 'pointer',
                }}
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => {
                  setImportNote(null)
                  document.getElementById('import-json-input')?.click()
                }}
                style={{
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(13px * var(--tf))',
                  color: 'var(--ink)',
                  background: 'transparent',
                  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                  borderRadius: 'calc(4px * var(--sf))',
                  padding: 'calc(6px * var(--sf)) calc(10px * var(--sf))',
                  cursor: 'pointer',
                }}
              >
                Import JSON
              </button>
              <input
                id="import-json-input"
                type="file"
                accept="application/json,.json"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </div>
            <RecipeTable
              rows={visible}
              sortKeys={sortKeys}
              onSort={setSortKeys}
              onEdit={(id) => openForm('edit', id)}
              onDelete={handleDelete}
            />
          </Stack>
        )}
      </Card>
    </AppShell>
  )
}
