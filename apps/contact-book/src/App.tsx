import { useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Card,
  Actions,
  Button,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  Stack,
  SectionLabel,
  Tag,
  Keys,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { RecordTable, type ColumnDef } from '@lacuna/record-table'
import { RecordForm, type FieldDef } from '@lacuna/record-form'
import { fuzzySearch } from '@lacuna/fuzzy-search'
import { toCsv } from '@lacuna/csv-parse'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { openFile, saveText } from '@lacuna/file-save-open'
import { TagInput } from '@lacuna/tag-input'

type ContactData = {
  name: string
  email: string
  phone: string
  category: string
  tags: string
  notes: string
}

type ContactRecord = ContactData & { id: string }

const CATEGORIES = ['Personal', 'Work', 'Family', 'Other']

const fields: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  {
    name: 'category',
    label: 'Category',
    type: 'select',
    options: CATEGORIES,
  },
  { name: 'notes', label: 'Notes', type: 'text' },
]

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function detectDuplicateEmail(
  email: string,
  contacts: ContactRecord[],
  excludeId?: string,
): boolean {
  const trimmed = email.trim().toLowerCase()
  if (trimmed === '') return false
  return contacts.some(
    (c) => c.email.trim().toLowerCase() === trimmed && c.id !== excludeId,
  )
}

export function App() {
  const { state, actions } = useCollection<ContactData>({
    storageKey: 'lacuna.contact-book',
  })

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list')
  const [editing, setEditing] = useState<string | null>(null)
  const [sortKeys, setSortKeys] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState('')
  const [duplicateEmail, setDuplicateEmail] = useState(false)
  const [draftTags, setDraftTags] = useState<string[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const contacts: ContactRecord[] = useMemo(
    () =>
      state.activeItems.map((item) => ({
        id: item.id,
        name: item.data.name,
        email: item.data.email,
        phone: item.data.phone,
        category: item.data.category ?? 'Other',
        tags: item.data.tags ?? '',
        notes: item.data.notes,
      })),
    [state.activeItems],
  )

  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const c of contacts) seen.add(c.category)
    return CATEGORIES.filter((cat) => seen.has(cat))
  }, [contacts])

  const filtered = useMemo(() => {
    let result = contacts
    if (categoryFilter !== '')
      result = result.filter((c) => c.category === categoryFilter)
    if (query.trim() !== '') {
      const matches = fuzzySearch(result, query, {
        fields: ['name', 'email', 'phone'],
      })
      result = matches
        .map((m) => result[m.index])
        .filter((c): c is ContactRecord => c !== undefined)
    }
    return result
  }, [contacts, query, categoryFilter])

  function handleAdd(values: Record<string, string | number>) {
    const name = String(values.name ?? '').trim()
    const email = String(values.email ?? '').trim()
    const phone = String(values.phone ?? '').trim()
    const category = String(values.category ?? 'Other')
    const notes = String(values.notes ?? '').trim()
    actions.add({ name, email, phone, category, tags: draftTags.join(','), notes })
    setDuplicateEmail(false)
    setDraftTags([])
    setMode('list')
  }

  function handleEdit(id: string, values: Record<string, string | number>) {
    const name = String(values.name ?? '').trim()
    const email = String(values.email ?? '').trim()
    const phone = String(values.phone ?? '').trim()
    const category = String(values.category ?? 'Other')
    const notes = String(values.notes ?? '').trim()
    actions.update(id, {
      name,
      email,
      phone,
      category,
      tags: draftTags.join(','),
      notes,
    })
    setDuplicateEmail(false)
    setDraftTags([])
    setEditing(null)
    setMode('list')
  }

  function handleDelete(id: string) {
    actions.remove(id)
    if (editing === id) setEditing(null)
    setMode('list')
    setQuery('')
    setCategoryFilter('')
  }

  function handleExportCsv() {
    const rows: string[][] = [['Name', 'Email', 'Phone', 'Notes']]
    for (const c of filtered) {
      rows.push([c.name, c.email, c.phone, c.notes])
    }
    saveText(toCsv(rows), { filename: 'contacts.csv', mimeType: 'text/csv' })
  }

  function handleExportJson() {
    const records = contacts.map((c) => ({
      id: c.id,
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        category: c.category,
        tags: c.tags,
        notes: c.notes,
      },
      createdAt: 0,
      updatedAt: 0,
    }))
    const json = exportBackup<ContactData>({
      appId: 'contact-book',
      version: 1,
      records,
    })
    saveText(json, {
      filename: 'contacts-backup.json',
      mimeType: 'application/json',
    })
  }

  async function handleImport() {
    setImportError(null)
    const file = importInputRef.current?.files?.[0]
    if (file === undefined) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setImportError('Could not read the file. Make sure it is valid JSON.')
      return
    }
    try {
      const jsonText =
        typeof result.data === 'string' ? result.data : JSON.stringify(result.data)
      const imported = importBackup<ContactData>(jsonText, {
        currentVersion: 1,
        validate: (r) => {
          const d = r.data
          if (typeof d.name !== 'string' || d.name.trim() === '')
            return 'Missing name'
          return null
        },
      })
      for (const rec of imported.records) {
        const existing = contacts.find(
          (c) =>
            c.email.trim().toLowerCase() ===
            String(rec.data.email ?? '').trim().toLowerCase(),
        )
        if (existing !== undefined) {
          actions.update(existing.id, { ...rec.data })
        } else {
          actions.add(rec.data)
        }
      }
      if (imported.droppedCount > 0) {
        setImportError(
          `${imported.droppedCount} record(s) were skipped due to validation errors.`,
        )
      }
    } catch {
      setImportError('Invalid backup file. Expected a Contact Book JSON export.')
    }
  }

  function startEdit(id: string) {
    const contact = contacts.find((c) => c.id === id)
    if (contact === undefined) return
    setDraftTags(parseTags(contact.tags))
    setEditing(id)
    setMode('edit')
    setDuplicateEmail(false)
  }

  function openAddForm() {
    setDraftTags([])
    setDuplicateEmail(false)
    setEditing(null)
    setMode('add')
  }

  function closeForm() {
    setMode('list')
    setEditing(null)
    setDraftTags([])
    setDuplicateEmail(false)
  }

  const editingContact =
    editing !== null ? contacts.find((c) => c.id === editing) : undefined

  function checkDuplicateOnEmailChange(email: string) {
    const excludeId = editing ?? undefined
    setDuplicateEmail(detectDuplicateEmail(email, contacts, excludeId))
  }

  const columns: ColumnDef<ContactRecord>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'category', header: 'Category' },
    {
      key: 'tags',
      header: 'Tags',
      formatter: (value) => {
        const tags = parseTags(String(value ?? ''))
        if (tags.length === 0)
          return <span style={{ color: 'var(--ink-40)' }}>—</span>
        return (
          <span
            style={{
              display: 'inline-flex',
              gap: 'calc(4px * var(--sf))',
              flexWrap: 'wrap',
            }}
          >
            {tags.map((t) => (
              <Tag key={t}>{t}</Tag>
            ))}
          </span>
        )
      },
    },
    {
      key: '_actions',
      header: '',
      formatter: (_value, record) => (
        <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
          <Button
            kind="ghost"
            ariaLabel={`Edit ${record.name}`}
            onClick={() => startEdit(record.id)}
          >
            Edit
          </Button>
            <Button
              kind="ghost"
              ariaLabel={`Delete ${record.name}`}
              onClick={() => handleDelete(record.id)}
            >
              Delete
            </Button>
        </div>
      ),
    },
  ]

  const isForm = mode === 'add' || (mode === 'edit' && editingContact !== undefined)

  return (
    <AppShell
      name="Contact Book"
      icon="people"
      hue="gold"
      category="Personal"
      meta={`${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`}
      side={
        <Rail title="Overview">
          <KpiRow>
            <Kpi value={String(contacts.length)} label="Total" accent />
          </KpiRow>
          {categories.length > 0 && (
            <>
              <SectionLabel>By category</SectionLabel>
              <Stack>
                {categories.map((cat) => {
                  const count = contacts.filter((c) => c.category === cat).length
                  return (
                    <div
                      key={cat}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 'calc(8px * var(--sf))',
                      }}
                    >
                      <span>{cat}</span>
                      <span style={{ fontFamily: 'var(--mono)' }}>{count}</span>
                    </div>
                  )
                })}
              </Stack>
            </>
          )}
          <SectionLabel>Shortcuts</SectionLabel>
          <Keys
            items={[
              ['/', 'Focus search'],
              ['Enter', 'Commit a tag'],
            ]}
          />
        </Rail>
      }
    >
      <Stack>
        {isForm ? (
          <Card
            mono={mode === 'edit' ? 'Edit' : 'New'}
            title={mode === 'edit' ? 'Edit contact' : 'Add a contact'}
          >
            {mode === 'edit' && editingContact !== undefined ? (
              <RecordForm
                key={`edit-${editingContact.id}`}
                fields={fields}
                initialValues={{
                  name: editingContact.name,
                  email: editingContact.email,
                  phone: editingContact.phone,
                  category: editingContact.category,
                  notes: editingContact.notes,
                }}
                submitLabel="Save"
                cancelLabel="Cancel"
                onSubmit={(values) => handleEdit(editingContact.id, values)}
                onCancel={closeForm}
              />
            ) : (
              <RecordForm
                key="add"
                fields={fields}
                submitLabel="Save"
                cancelLabel="Cancel"
                onValuesChange={(values) => {
                  checkDuplicateOnEmailChange(String(values.email ?? ''))
                }}
                onSubmit={handleAdd}
                onCancel={closeForm}
              />
            )}
            {mode === 'add' && duplicateEmail && (
              <div
                role="alert"
                style={{
                  marginTop: 'calc(8px * var(--sf))',
                  color: 'var(--danger)',
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(12px * var(--tf))',
                }}
              >
                A contact with this email already exists.
              </div>
            )}
            <div style={{ marginTop: 'calc(12px * var(--sf))' }}>
              <TagInput
                tags={draftTags}
                onChange={setDraftTags}
                placeholder="Add a tag"
                aria-label="Tags"
              />
            </div>
          </Card>
        ) : (
          <>
            <Card mono="New" title="Add a contact">
              <Actions>
                <Button kind="primary" onClick={openAddForm}>
                  Add contact
                </Button>
                <Button
                  kind="secondary"
                  onClick={() => importInputRef.current?.click()}
                >
                  Import JSON
                </Button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={handleImport}
                />
              </Actions>
              {importError !== null && (
                <div
                  role="alert"
                  style={{
                    marginTop: 'calc(8px * var(--sf))',
                    color: 'var(--danger)',
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                  }}
                >
                  {importError}
                </div>
              )}
            </Card>

            <Card
              mono={`${filtered.length} of ${contacts.length}`}
              title="Contacts"
              actions={
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(8px * var(--sf))',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <input
                    type="text"
                    aria-label="Search"
                    placeholder="Search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                      padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
                      border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                      borderRadius: 'calc(4px * var(--sf))',
                      background: 'var(--paper)',
                      color: 'var(--ink)',
                      fontFamily: 'var(--sans)',
                      fontSize: 'calc(13px * var(--tf))',
                    }}
                  />
                  {categories.length > 1 && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 'calc(4px * var(--sf))',
                      }}
                    >
                      <Tag accent={categoryFilter === ''}>
                        <button
                          type="button"
                          style={{
                            appearance: 'none',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            margin: 0,
                            font: 'inherit',
                            color: 'inherit',
                            cursor: 'pointer',
                          }}
                          onClick={() => setCategoryFilter('')}
                        >
                          All
                        </button>
                      </Tag>
                      {categories.map((cat) => (
                        <Tag key={cat} accent={categoryFilter === cat}>
                          <button
                            type="button"
                            style={{
                              appearance: 'none',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              font: 'inherit',
                              color: 'inherit',
                              cursor: 'pointer',
                            }}
                            onClick={() =>
                              setCategoryFilter(
                                categoryFilter === cat ? '' : cat,
                              )
                            }
                          >
                            {cat}
                          </button>
                        </Tag>
                      ))}
                    </div>
                  )}
                  <Button
                    kind="secondary"
                    ariaLabel="Export CSV"
                    onClick={handleExportCsv}
                  >
                    Export CSV
                  </Button>
                  <Button
                    kind="ghost"
                    ariaLabel="Export JSON"
                    onClick={handleExportJson}
                  >
                    Export JSON
                  </Button>
                </div>
              }
            >
              {contacts.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No contacts yet"
                  detail="Add your first contact to get started. You can also import a JSON backup."
                  actionLabel="New contact"
                  onAction={openAddForm}
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  mono="No match"
                  title="No contacts match"
                  detail={
                    query.trim() !== ''
                      ? `No contacts found for "${query}".`
                      : 'No contacts in this category.'
                  }
                  actionLabel={
                    query.trim() !== '' ? 'Clear search' : 'Clear category'
                  }
                  onAction={() => {
                    if (query.trim() !== '') setQuery('')
                    else setCategoryFilter('')
                  }}
                />
              ) : (
                <RecordTable
                  records={filtered}
                  columns={columns}
                  sortKeys={sortKeys}
                  onSort={setSortKeys}
                  ariaLabel="Contacts"
                />
              )}
            </Card>
          </>
        )}
      </Stack>

      <style>{`
        table thead th button {
          width: 100%;
          text-align: left;
        }
      `}</style>
    </AppShell>
  )
}
