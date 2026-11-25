// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
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

  const tasks = state.activeItems

  const { itemProps, listProps } = useDragReorder({
    listCount: 1,
    onReorder: (_fromList, fromIndex, _toList, toIndex) => actions.reorder(fromIndex, toIndex),
  })

  const total = tasks.length
  const done = tasks.filter((t) => t.data.done).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)

  const addTask = () => {
    const t = title.trim()
    if (t === '') {
      setError('Enter a task title')
      return
    }
    if (tasks.some((task) => task.data.title.toLowerCase() === t.toLowerCase())) {
      setError('Task already exists')
      return
    }
    actions.add({ title: t, done: false, due: due || null })
    setTitle('')
    setDue('')
    setError(null)
  }

  return (
    <AppShell
      name="Simple Todo List"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={total === 0 ? 'Empty' : `${done} of ${total} done`}
    >
      <div
        role="progressbar"
        aria-label="Completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}% complete`}
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
          {total === 0 ? (
            <EmptyState
              mono="Empty"
              title="No tasks yet"
              detail="Add the first one above."
              actionLabel="Add a task"
              onAction={addTask}
            />
          ) : (
            <ul aria-label="Tasks" {...listProps(0)} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {tasks.map((task, index) => {
                const drag = itemProps(0, index)
                const dueText = formatDue(task.data.due)
                return (
                  <li key={task.id} {...drag} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="checkbox"
                      aria-label={task.data.title}
                      checked={task.data.done}
                      onChange={(e) => actions.update(task.id, { done: e.target.checked })}
                    />
                    <span style={{ flex: 1 }}>
                      <span style={{ textDecoration: task.data.done ? 'line-through' : undefined }}>
                        {task.data.title}
                      </span>
                      {dueText !== null && (
                        <span style={{ marginLeft: 8, fontSize: '0.85em', opacity: 0.7 }}>
                          {dueText}
                        </span>
                      )}
                    </span>
                    <Button
                      kind="ghost"
                      ariaLabel={`Drag ${task.data.title}`}
                      title={`Drag ${task.data.title}`}
                    >
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
        </Card>
      </Stack>
    </AppShell>
  )
}
