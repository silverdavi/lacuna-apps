// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { useCollection } from '@lacuna/use-collection'
import { useDragReorder } from '@lacuna/use-drag-reorder'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Stack,
  TextInput,
} from '@lacuna/ui'

type Task = {
  title: string
  done: boolean
  due: string | null
}

type Tab = 'Tasks' | 'Done' | 'Settings'

const TABS: Tab[] = ['Tasks', 'Done', 'Settings']

function formatDue(due: string | null): string | null {
  if (!due) return null
  const [y, m, d] = due.split('-')
  if (!y || !m || !d) return null
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = String(date.getDate())
  return `Due: ${month} ${day}, ${date.getFullYear()}`
}

export function App() {
  const { state, actions } = useCollection<Task>({ storageKey: 'todo-list' })
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Tasks')

  const allTasks = state.activeItems
  const total = allTasks.length
  const doneCount = allTasks.filter((t) => t.data.done).length
  const progress = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  const shownTasks = tab === 'Done' ? allTasks.filter((t) => t.data.done) : allTasks

  const { itemProps, listProps } = useDragReorder({
    listCount: 1,
    onReorder: (_fromList, fromIndex, _toList, toIndex) =>
      actions.reorder(fromIndex, toIndex),
  })

  const addTask = () => {
    const t = title.trim()
    if (t === '') {
      setError('Enter a task title')
      return
    }
    if (allTasks.some((task) => task.data.title.toLowerCase() === t.toLowerCase())) {
      setError('Task already exists')
      return
    }
    actions.add({ title: t, done: false, due: due || null })
    setTitle('')
    setDue('')
    setError(null)
  }

  const clearCompleted = () => {
    for (const task of allTasks) {
      if (task.data.done) actions.remove(task.id)
    }
    setTab('Tasks')
  }

  const exportCsv = () => {
    const rows = [
      ['title', 'due', 'done'],
      ...allTasks.map((task) => [
        task.data.title,
        task.data.due ?? '',
        String(task.data.done),
      ]),
    ]
    saveText(toCsv(rows), { filename: 'tasks.csv', mimeType: 'text/csv' })
  }

  return (
    <AppShell
      name="Simple Todo List"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={total === 0 ? 'Empty' : `${doneCount} of ${total} done`}
      actions={
        <Button ariaLabel="Export CSV" onClick={exportCsv}>
          Export CSV
        </Button>
      }
    >
      <div
        role="progressbar"
        aria-label="Completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}% complete`}
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: 'var(--surface)',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      />
      <Stack>
        <Card mono="New" title="Add a task">
          <FormGrid>
            <TextInput
              label="Task title"
              value={title}
              onChange={(v) => {
                setTitle(v)
                if (error !== null) setError(null)
              }}
              placeholder="What needs doing?"
              error={error}
            />
            <TextInput label="Due date" value={due} onChange={setDue} type="date" />
          </FormGrid>
          <Button kind="primary" ariaLabel="Add task" onClick={addTask}>
            Add task
          </Button>
        </Card>

        <Card mono={`${total} saved`} title="Tasks">
          {tab === 'Settings' ? (
            <Stack>
              <p style={{ margin: 0 }}>
                Remove every finished task from the list. Unfinished tasks stay
                in place.
              </p>
              <Button kind="danger" ariaLabel="Clear completed" onClick={clearCompleted}>
                Clear completed
              </Button>
            </Stack>
          ) : (
            <>
              <div role="tablist" aria-label="Views" className="lc-tabs">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={tab === t ? 'lc-tab active' : 'lc-tab'}
                    style={tab === t ? undefined : { color: 'var(--mid)' }}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {shownTasks.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No tasks yet"
                  detail="Add the first one above."
                  actionLabel="Add a task"
                  onAction={addTask}
                />
              ) : (
                <ul
                  aria-label="Tasks"
                  className="task-list"
                  {...listProps(0)}
                >
                  {shownTasks.map((task, index) => {
                    const drag = itemProps(0, index)
                    const dueText = formatDue(task.data.due)
                    return (
                        <li
                          key={task.id}
                          className="task-row"
                          {...drag}
                        >
                        <input
                          type="checkbox"
                          aria-label={task.data.title}
                          checked={task.data.done}
                          onChange={(e) => actions.update(task.id, { done: e.target.checked })}
                        />
                        <span
                          style={{
                            flex: 1,
                            textDecoration: task.data.done ? 'line-through' : undefined,
                          }}
                        >
                          {task.data.title}
                          {dueText !== null && (
                            <span className="task-due">
                              {dueText}
                            </span>
                          )}
                        </span>
                        <Button kind="ghost" ariaLabel={`Drag ${task.data.title}`}>
                          Drag
                        </Button>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${task.data.title}`}
                          onClick={() => actions.remove(task.id)}
                        >
                          Delete {task.data.title}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}
