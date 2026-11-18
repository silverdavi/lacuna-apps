import { useEffect, useState } from 'react'
import { Button, Card, EmptyState, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'
import { addTask, deleteTask, reorderTasks, store, toggleTask } from './host'
import type { TodoTask } from './host'

function formatDue(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `Due: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function App() {
  const [tasks, setTasks] = useState<TodoTask[]>(() => store.list())
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [error, setError] = useState('')
  const [dragId, setDragId] = useState('')

  useEffect(() => {
    setTasks(store.list())
  }, [])

  const done = tasks.filter((t) => t.completed).length
  const progress = tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100)

  function handleAdd() {
    const t = title.trim()
    if (!t) return
    const { duplicate } = addTask(t, due || null)
    if (duplicate) {
      setError('Task already exists')
    } else {
      setError('')
      setTitle('')
      setDue('')
    }
    setTasks(store.list())
  }

  function handleToggle(id: string) {
    setTasks(toggleTask(id))
  }

  function handleDelete(id: string) {
    setTasks(deleteTask(id))
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    setTasks(reorderTasks(dragId, targetId))
    setDragId('')
  }

  return (
    <main>
      <Stack lg>
        <h1>Simple Todo List</h1>
        <div
          role="progressbar"
          aria-label="Completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          style={{
            height: 'calc(8px * var(--sf))',
            background: 'var(--ink-40)',
            border: '1px solid var(--ui-line2)',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
        <MonoLabel>{progress}% complete</MonoLabel>
        <Card mono="List" title="Tasks">
          <Stack>
            {tasks.length === 0 && <EmptyState title="No tasks yet" />}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {tasks.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    handleDrop(task.id)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'calc(8px * var(--sf))',
                    padding: 'calc(8px * var(--sf))',
                    borderBottom: '1px solid var(--ui-line2)',
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Mark ${task.title} complete`}
                    checked={task.completed}
                    onChange={() => handleToggle(task.id)}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--serif)',
                      textDecorationLine: task.completed ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <MonoLabel faint sm>{formatDue(task.dueDate)}</MonoLabel>
                  )}
                  <Button kind="ghost" onClick={() => handleDelete(task.id)}>
                    Delete {task.title}
                  </Button>
                </li>
              ))}
            </ul>
            {error && <MonoLabel accent>{error}</MonoLabel>}
            <TextInput label="Task title" value={title} onChange={setTitle} />
            <TextInput label="Due date" value={due} onChange={setDue} />
            <Button kind="primary" onClick={handleAdd}>
              Add task
            </Button>
          </Stack>
        </Card>
      </Stack>
    </main>
  )
}
