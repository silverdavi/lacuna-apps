import { useMemo, useState } from 'react'
import { AppShell, Card, Actions, Button, EmptyState, TextInput, Stack } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { RecordTable, type ColumnDef } from '@lacuna/record-table'
import { RecordForm, type FieldDef } from '@lacuna/record-form'
import { fuzzySearch } from '@lacuna/fuzzy-search'
import { toCsv } from '@lacuna/csv-parse'

type ContactData = { name: string; email: string; phone: string; notes: string }

type ContactRecord = ContactData & { id: string }

const fields: FieldDef[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'notes', label: 'Notes', type: 'text' },
]

function triggerCsvDownload(csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'contacts.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function App() {
  const { state, actions } = useCollection<ContactData>({
    storageKey: 'lacuna.contact-book',
  })

  const tableHeaderFix = `
    table th button {
      width: 100%;
      justify-content: flex-start;
    }
  `

  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [sortKeys, setSortKeys] = useState<string[]>([])

  const contacts: ContactRecord[] = useMemo(
    () => state.activeItems.map((item) => ({ id: item.id, ...item.data })),
    [state.activeItems],
  )

  const filtered = useMemo(() => {
    if (query.trim() === '') return contacts
    const matches = fuzzySearch(contacts, query, { fields: ['name', 'email', 'phone'] })
    return matches
      .map((m) => contacts[m.index])
      .filter((c): c is ContactRecord => c !== undefined)
  }, [contacts, query])

  function handleAdd(values: Record<string, string | number>) {
    actions.add({
      name: String(values.name ?? ''),
      email: String(values.email ?? ''),
      phone: String(values.phone ?? ''),
      notes: String(values.notes ?? ''),
    })
    setShowForm(false)
  }

  function handleEdit(id: string, values: Record<string, string | number>) {
    actions.update(id, {
      name: String(values.name ?? ''),
      email: String(values.email ?? ''),
      phone: String(values.phone ?? ''),
      notes: String(values.notes ?? ''),
    })
    setEditing(null)
  }

  function handleDelete(id: string) {
    actions.remove(id)
    if (editing === id) setEditing(null)
  }

  function handleExportCsv() {
    const rows: string[][] = [['Name', 'Email', 'Phone', 'Notes']]
    for (const c of filtered) {
      rows.push([c.name, c.email, c.phone, c.notes])
    }
    triggerCsvDownload(toCsv(rows))
  }

  function startEdit(id: string) {
    setEditing(id)
    setShowForm(false)
  }

  const editingContact = editing !== null ? contacts.find((c) => c.id === editing) : undefined
  const isEditing = editing !== null
  const showAddForm = showForm && !isEditing

  const columns: ColumnDef<ContactRecord>[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'notes', header: 'Notes' },
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

  return (
    <>
      <style>{tableHeaderFix}</style>
      <AppShell
        name="Contact Book"
        icon="people"
        hue="gold"
        category="Personal"
        meta={`${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'}`}
      >
        <Stack>
          {isEditing && editingContact !== undefined ? (
            <Card mono="Edit" title="Edit contact">
              <RecordForm
                fields={fields}
                initialValues={{
                  name: editingContact.name,
                  email: editingContact.email,
                  phone: editingContact.phone,
                  notes: editingContact.notes,
                }}
                submitLabel="Save"
                cancelLabel="Cancel"
                onSubmit={(values) => handleEdit(editingContact.id, values)}
                onCancel={() => setEditing(null)}
              />
            </Card>
          ) : showAddForm ? (
            <Card mono="New" title="Add a contact">
              <RecordForm
                fields={fields}
                submitLabel="Save"
                cancelLabel="Cancel"
                onSubmit={handleAdd}
                onCancel={() => setShowForm(false)}
              />
            </Card>
          ) : (
            <Card mono="New" title="Add a contact">
              <Actions>
                <Button kind="primary" onClick={() => setShowForm(true)}>
                  Add contact
                </Button>
              </Actions>
            </Card>
          )}

          <Card
            mono={`${filtered.length} of ${contacts.length}`}
            title="Contacts"
            actions={
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
                <TextInput
                  label="Search"
                  placeholder="Search"
                  value={query}
                  onChange={(v) => setQuery(v)}
                />
                <Button kind="secondary" ariaLabel="Export CSV" onClick={handleExportCsv}>
                  Export CSV
                </Button>
              </div>
            }
          >
            {contacts.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No contacts yet"
                detail="Add your first contact above."
                actionLabel="Add contact"
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                mono="No match"
                title="No contacts match"
                detail={`No contacts found for "${query}".`}
                actionLabel="Clear search"
                onAction={() => setQuery('')}
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
        </Stack>
      </AppShell>
    </>
  )
}
