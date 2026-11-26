import { useEffect, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Row,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  dayKey,
  isDone,
  lastSeven,
  rename,
  remove,
  streak,
  toggleDone,
  validateName,
  type Habit,
} from './engine'
import { store } from './host/mock'

const TABS = ['Today', 'Streaks', 'History'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [tab, setTab] = useState<Tab>('Today')
  const [habits, setHabits] = useState<Habit[]>(() => store.list())
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<Habit | null>(null)
  const clipboard = useClipboard()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleting) setDeleting(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleting])

  const today = dayKey(new Date())
  const cells = lastSeven(new Date())

  function persist(next: Habit[]) {
    setHabits(next)
    store.replaceAll(next)
  }

  function addHabit() {
    const msg = validateName(newName, habits)
    if (msg) {
      setError(msg)
      return
    }
    setError(null)
    const created = store.add({ name: newName.trim(), done: [] })
    setNewName('')
    setHabits([...habits, created])
  }

  function startRename(h: Habit) {
    setRenamingId(h.id)
    setRenameValue(h.name)
    setError(null)
  }

  function cancelRename() {
    setRenamingId(null)
    setError(null)
  }

  function commitRename() {
    if (!renamingId) return
    const target = habits.find((h) => h.id === renamingId)
    if (!target) return
    const msg = validateName(renameValue, habits.filter((h) => h.id !== renamingId))
    if (msg) {
      setError(msg)
      return
    }
    persist(rename(habits, renamingId, renameValue))
    setRenamingId(null)
  }

  function renameErrorText(): string | null {
    if (!renamingId) return null
    const target = habits.find((h) => h.id === renamingId)
    if (!target) return null
    if (renameValue.trim() === target.name) return null
    return validateName(renameValue, habits.filter((h) => h.id !== renamingId))
  }

  function copyHistory() {
    const lines = habits.map((h) => {
      const ticks = h.done.map((d) => {
        const date = new Date(d + 'T12:00:00')
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      })
      return `${h.name}: ${ticks.length} check-ins${ticks.length ? ' (' + ticks.join(', ') + ')' : ''}`
    })
    void clipboard.copy(lines.join('\n'))
  }

  const best = habits.length ? Math.max(...habits.map((h) => streak(h, new Date()))) : 0
  const tickedToday = habits.filter((h) => isDone(h, today)).length
  const renamingTarget = habits.find((h) => h.id === renamingId)

  function onRenameKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitRename()
    if (e.key === 'Escape') cancelRename()
  }

  return (
    <AppShell name="Habit tracker">
      <KpiRow>
        <Kpi value={habits.length} label="Habits" />
        <Kpi value={tickedToday} label="Done today" accent={tickedToday > 0} />
        <Kpi value={best} label="Best streak" accent={best > 0} />
      </KpiRow>

      <Card title="Habits">
        <FormGrid>
          {renamingTarget ? (
            <div onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') cancelRename()
            }}>
              <TextInput
                label={`New name for ${renamingTarget.name}`}
                value={renameValue}
                onChange={(v) => {
                  setRenameValue(v)
                  if (error) setError(null)
                }}
                error={error ?? renameErrorText()}
                hint="Enter renames, Escape cancels."
              />
            </div>
          ) : (
            <TextInput
              label="Habit name"
              value={newName}
              onChange={(v) => {
                setNewName(v)
                if (error) setError(null)
              }}
              error={error}
            />
          )}
        </FormGrid>
        {renamingTarget ? (
          <span>
            <Button kind="primary" onClick={commitRename}>
              Save name
            </Button>
            <Button kind="secondary" onClick={cancelRename}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button kind="primary" onClick={addHabit}>
            Add habit
          </Button>
        )}
      </Card>

      <Card
        title="Today"
        mono="Last seven days"
        actions={
          tab === 'History' && habits.length > 0 ? (
            <Button kind="secondary" onClick={copyHistory}>
              Copy summary
            </Button>
          ) : undefined
        }
      >
        {habits.length === 0 ? (
          <EmptyState title="No habits yet" detail="Add a habit above and tick the days you did it." />
        ) : tab === 'Today' ? (
          <List label="Habits">
            {habits.map((h) => (
              <Row
                key={h.id}
                title={h.name}
                value={`Streak: ${streak(h, new Date())}`}
                meta={
                  <span>
                    {cells.map((c) => (
                      <input
                        key={c.key}
                        type="checkbox"
                        checked={isDone(h, c.key)}
                        aria-label={`${h.name}, ${c.label}`}
                        style={{ margin: '0 2px' }}
                        onChange={() => persist(toggleDone(habits, h.id, c.key))}
                      />
                    ))}
                  </span>
                }
                action={
                  <span>
                    <Button kind="ghost" onClick={() => startRename(h)}>
                      Rename {h.name}
                    </Button>
                    <Button kind="ghost" onClick={() => setDeleting(h)}>
                      Delete {h.name}
                    </Button>
                  </span>
                }
              />
            ))}
          </List>
        ) : tab === 'Streaks' ? (
          <List label="Streaks">
            {habits.map((h) => (
              <Row
                key={h.id}
                title={h.name}
                value={`Streak: ${streak(h, new Date())}`}
                action={
                  <Tag accent={streak(h, new Date()) > 0}>
                    {streak(h, new Date()) > 0 ? 'active' : 'resting'}
                  </Tag>
                }
              />
            ))}
          </List>
        ) : (
          <List label="Check-in history">
            {habits.map((h) => (
              <Row key={h.id} title={h.name} value={`${h.done.length} check-ins`} />
            ))}
          </List>
        )}
        {tab === 'History' && clipboard.copied ? <Tag accent>copied</Tag> : null}
      </Card>

      {deleting ? (
        <div
          role="dialog"
          aria-label={`Delete ${deleting.name}?`}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'color-mix(in srgb, var(--ink) 55%, transparent)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 10,
          }}
        >
          <Card title={`Delete ${deleting.name}?`}>
            <p style={{ color: 'var(--ink)' }}>This removes the habit and all of its ticks.</p>
            <Button
              kind="danger"
              onClick={() => {
                persist(remove(habits, deleting.id))
                setDeleting(null)
              }}
            >
              Confirm delete
            </Button>
            <Button kind="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
