import { useState } from 'react'
import { AppShell, Button, Card, List, Row, Tag, TextInput } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { saveText } from '@lacuna/file-save-open'

function CategorySelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <select
        className="lc-input"
        value={value}
        size={options.length}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

type Step = { id: string; label: string; done: boolean }
type Entry = { title: string; category: string; steps: Step[] }
type Draft = { id: string; entry: Entry }

const CATEGORIES = ['Adventure', 'Travel', 'Learning', 'Creative', 'Wellness', 'Other']

export function App() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState(CATEGORIES[0])
  const [addingStepFor, setAddingStepFor] = useState<string | null>(null)
  const [stepLabel, setStepLabel] = useState('')
  const [search, setSearch] = useState('')
  const query = search.trim().toLowerCase()
  const [toast, setToast] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState(CATEGORIES[0])

  const { state, actions } = useCollection<Entry>({
    storageKey: 'lacuna.bucket-list.entries',
    initialItems: [],
  })



  const visible = state.activeItems.filter(({ data: entry }) => {
    const matchesQuery = !query || entry.title.toLowerCase().includes(query) || entry.category.toLowerCase().includes(query)
    return matchesQuery
  })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(''), 4000)
  }

  function addEntry() {
    const title = newTitle.trim()
    if (!title) return
    actions.add({
      title,
      category: newCategory,
      steps: [],
    })
    setNewTitle('')
    setNewCategory(CATEGORIES[0])
  }

  function saveDraft() {
    if (!draft) return
    const title = editTitle.trim()
    if (!title) return
    actions.update(draft.id, {
      title,
      category: editCategory,
      steps: draft.entry.steps,
    })
    setDraft(null)
  }

  function toggleStep(entryId: string, stepId: string) {
    const entry = state.activeItems.find((item) => item.id === entryId)?.data
    if (!entry) return
    actions.update(entryId, {
      steps: entry.steps.map((step) => (step.id === stepId ? { ...step, done: !step.done } : step)),
    })
  }

  function addStep(entryId: string) {
    const label = stepLabel.trim()
    if (!label) return
    const entry = state.activeItems.find((item) => item.id === entryId)?.data
    if (!entry) return
    const step: Step = { id: `${entryId}-step-${entry.steps.length + 1}`, label, done: false }
    actions.update(entryId, { steps: [...entry.steps, step] })
    setStepLabel('')
    setAddingStepFor(null)
  }

  function deleteEntry(entryId: string) {
    actions.remove(entryId)
    if (draft?.id === entryId) {
      setDraft(null)
    }
    if (addingStepFor === entryId) setAddingStepFor(null)
  }

  function exportCsv() {
    const rows = state.activeItems.map(({ data: entry }) => {
      const done = entry.steps.filter((step) => step.done).length
      const total = entry.steps.length
      return `${entry.title},${entry.category},${done}/${total}`
    })
    const csv = `Title,Category,Progress\n${rows.join('\n')}`
    saveText(csv, { filename: 'bucket-list.csv', mimeType: 'text/csv' })
    showToast(`Exported ${state.activeItems.length} ${state.activeItems.length === 1 ? 'entry' : 'entries'}`)
  }

  return (
    <AppShell
      name="Bucket List"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={`${state.activeItems.length} ${state.activeItems.length === 1 ? 'entry' : 'entries'}`}
    >
      <h1>Bucket List Tracker</h1>

      <div role="tablist" aria-label="Views">
        <button type="button" role="tab" aria-selected={true}>
          Entries
        </button>
      </div>

      <Card mono={draft ? 'Edit' : 'New'} title={draft ? 'Edit entry' : 'Add an entry'}>
        {draft ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              saveDraft()
            }}
          >
            <TextInput label="Title" value={editTitle} onChange={setEditTitle} />
            <CategorySelect label="Category" value={editCategory} onChange={setEditCategory} options={CATEGORIES} />
            <Button type="submit">Save</Button>
            <Button kind="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              addEntry()
            }}
          >
            <TextInput label="Title" value={newTitle} onChange={setNewTitle} />
            <CategorySelect label="Category" value={newCategory} onChange={setNewCategory} options={CATEGORIES} />
            <Button type="submit">Add entry</Button>
          </form>
        )}
      </Card>

      <Card mono={`${visible.length} shown`} title="Entries">
        <TextInput label="Search" value={search} onChange={setSearch} />
        <Button kind="secondary" onClick={exportCsv}>
          Export CSV
        </Button>
        {visible.length === 0 ? (
          <p>No entries yet</p>
        ) : (
          <List label="Entries">
            {visible.map(({ id: entryId, data: entry }) => {
              const done = entry.steps.filter((step) => step.done).length
              const total = entry.steps.length
              const complete = total > 0 && done === total
              return (
                <li key={entryId}>
                    <Row
                      title={entry.title}
                      action={
                        <span>
                          {complete && <Tag accent>Complete</Tag>}
                          <span aria-label="Progress">{`${done}/${total}`}</span>
                        </span>
                      }
                    />
                  {entry.steps.map((step) => (
                    <label key={step.id}>
                      <input
                        type="checkbox"
                        aria-label={step.label}
                        checked={step.done}
                        onChange={() => toggleStep(entryId, step.id)}
                      />
                      {step.label}
                    </label>
                  ))}
                  {addingStepFor === entryId ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        addStep(entryId)
                      }}
                    >
                      <TextInput label="Step" value={stepLabel} onChange={setStepLabel} />
                      <Button type="submit">Add step</Button>
                    </form>
                  ) : (
                    <Button kind="ghost" onClick={() => setAddingStepFor(entryId)}>
                      Add step
                    </Button>
                  )}
                    <Button
                      kind="ghost"
                      onClick={() => {
                        setDraft({ id: entryId, entry })
                        setEditTitle(entry.title)
                        setEditCategory(entry.category)
                      }}
                    >
                      Edit
                    </Button>
                    <Button kind="ghost" onClick={() => deleteEntry(entryId)}>
                      Delete
                    </Button>
                </li>
              )
            })}
          </List>
        )}
      </Card>

      {toast && <p aria-live="polite">{toast}</p>}
    </AppShell>
  )
}
