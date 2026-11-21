import { useEffect, useState } from 'react'
import { createMockRecordStore } from '@lacuna/host-mock'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Rail,
  Stack,
  TextInput,
} from '@lacuna/ui'

type ColumnId = 'todo' | 'doing' | 'done'

type CardRec = {
  id: string
  title: string
  column: ColumnId
}

type Editing = {
  column: ColumnId
  cardId?: string
}

const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'In Progress' },
  { id: 'done', title: 'Done' },
]

const SAMPLE_CARDS: CardRec[] = [
  { id: 'kb-sample-1', title: 'Plan sprint', column: 'todo' },
  { id: 'kb-sample-2', title: 'Write user stories', column: 'doing' },
  { id: 'kb-sample-3', title: 'Draft release notes', column: 'done' },
]

const store = createMockRecordStore<CardRec>({
  key: 'lacuna.kanban-board.cards',
  idPrefix: 'kb',
  validate: (v: unknown): v is CardRec => {
    const c = v as Partial<CardRec> | null
    return (
      !!c &&
      typeof c.id === 'string' &&
      typeof c.title === 'string' &&
      (c.column === 'todo' || c.column === 'doing' || c.column === 'done')
    )
  },
})

function CardEditor({
  initialTitle,
  initialColumn,
  onDelete,
  onSave,
  onCancel,
}: {
  initialTitle: string
  initialColumn: ColumnId
  onDelete?: () => void
  onSave: (title: string) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initialTitle)
  const [column, setColumn] = useState<ColumnId>(initialColumn)

  return (
    <Stack>
      <TextInput label="Title" value={title} onChange={setTitle} placeholder="What needs doing?" />
      <TextInput label="Column" value={column} onChange={(v) => setColumn(v as ColumnId)} />
      <Stack>
        <Button
          kind="primary"
          ariaLabel="Save"
          disabled={title.trim().length === 0}
          onClick={() => onSave(title.trim())}
        >
          Save
        </Button>
        {onDelete !== undefined && (
          <Button kind="danger" ariaLabel="Delete card" onClick={onDelete}>
            Delete card
          </Button>
        )}
        <Button kind="ghost" ariaLabel="Cancel" onClick={onCancel}>
          Cancel
        </Button>
      </Stack>
    </Stack>
  )
}

export function App() {
  const [cards, setCards] = useState<CardRec[]>(() => store.list())
  const [editing, setEditing] = useState<Editing | null>(null)
  const [dragFrom, setDragFrom] = useState<CardRec | null>(null)

  useEffect(() => {
    store.replaceAll(cards)
  }, [cards])

  const { copy, copied } = useClipboard()

  const saveEdit = (cardId: string | undefined, title: string, dest: ColumnId) => {
    setCards((cs) => {
      if (cardId !== undefined) {
        return cs.map((c) => (c.id === cardId ? { ...c, title, column: dest } : c))
      }
      return [...cs, { id: `kb-${Date.now()}`, title, column: dest }]
    })
    setEditing(null)
  }

  const removeCard = (id: string) => {
    setCards((cs) => cs.filter((c) => c.id !== id))
    setEditing(null)
  }

  const openCard = (column: ColumnId, cardId: string) => {
    setEditing({ column, cardId })
  }

  const onDragStart = (e: React.DragEvent, c: CardRec) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', c.id)
    setDragFrom(c)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: React.DragEvent, dest: ColumnId) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, column: dest } : c)))
    setDragFrom(null)
  }

  const byColumn = (id: ColumnId) => cards.filter((c) => c.column === id)
  const todoCount = byColumn('todo').length
  const doingCount = byColumn('doing').length
  const doneCount = byColumn('done').length

  return (
    <AppShell
      name="Kanban Board"
      icon="grid"
      hue="blue"
      category="Productivity"
      meta={`${cards.length} cards`}
      status={copied ? 'Copied to clipboard' : 'Local · no network'}
      side={
        <Rail
          title="Kanban Board"
          note="Three columns · drag to move"
          chips={[`${cards.length} cards total`, `${todoCount} to do`, `${doingCount} in progress`, `${doneCount} done`]}
        />
      }
      actions={
        <Button kind="secondary" ariaLabel="Export JSON" onClick={() => void copy(JSON.stringify(cards))}>
          Export JSON
        </Button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 'calc(8px * var(--sf))',
          alignItems: 'start',
        }}
      >
        {COLUMNS.map((col) => {
          const colCards = byColumn(col.id)
          const open = editing !== null && editing.column === col.id
          const editingCard =
            open && editing !== null && editing.cardId !== undefined
              ? colCards.find((c) => c.id === editing.cardId)
              : undefined
          return (
            <Card
              key={col.id}
              mono={`${colCards.length} CARDS`}
              flush
              style={{
                outline:
                  dragFrom !== null && dragFrom.column !== col.id
                    ? 'calc(2px * var(--sf)) dashed var(--ui-line2)'
                    : undefined,
                outlineOffset: 'calc(2px * var(--sf))',
              }}
            >
              <div onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id)} style={{ display: 'contents' }}>
                <Stack>
                  <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{col.title}</span>
                    <span aria-hidden="true">{colCards.length}</span>
                  </h2>
                  {colCards.length === 0 && !open ? (
                    <EmptyState mono="Empty" title="No cards yet" detail={`Nothing in ${col.title}. Add a card to get started.`} />
                  ) : null}
                  {colCards.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        gap: 'calc(8px * var(--sf))',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        opacity: dragFrom !== null && dragFrom.id === c.id ? 0.4 : 1,
                      }}
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, c)}
                        onClick={() => openCard(col.id, c.id)}
                        style={{
                          background: 'none',
                          border: 'thin solid var(--ui-line2)',
                          borderRadius: 'calc(2px * var(--sf))',
                          padding: 'calc(8px * var(--sf)) calc(10px * var(--sf))',
                          fontFamily: 'var(--sans)',
                          fontSize: 'calc(13px * var(--tf))',
                          color: 'var(--ink)',
                          cursor: 'grab',
                        }}
                      >
                        {c.title}
                      </button>
                      <Button
                        kind="ghost"
                        ariaLabel="Delete card"
                        onClick={() => removeCard(c.id)}
                      >
                        Delete card
                      </Button>
                    </div>
                  ))}
                  <Button
                    kind="secondary"
                    ariaLabel="Add card"
                    onClick={() => setEditing({ column: col.id })}
                  >
                    Add card
                  </Button>
                  {open ? (
                    <Card title={editingCard !== undefined ? 'Edit card' : 'New card'} mono={col.title.toUpperCase()}>
                      <CardEditor
                        initialTitle={editingCard !== undefined ? editingCard.title : ''}
                        initialColumn={col.id}
                        onDelete={
                          editingCard !== undefined ? () => removeCard(editingCard.id) : undefined
                        }
                        onSave={(title) => saveEdit(
                          editingCard !== undefined ? editingCard.id : undefined,
                          title,
                          col.id,
                        )}
                        onCancel={() => setEditing(null)}
                      />
                    </Card>
                  ) : null}
                </Stack>
              </div>
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
