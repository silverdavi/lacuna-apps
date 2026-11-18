import { useEffect, useRef, useState } from 'react'
import { Body, Card, Stack } from '@lacuna/ui'
import { host, type Task } from './host'
import './app.css'

type Toast = { message: string; kind: 'error' | 'undo' }

function refresh(): Task[] {
  return host.listTasks()
}

export function App() {
  const [tasks, setTasks] = useState<Task[]>(() => refresh())
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [toast, setToast] = useState<Toast | null>(null)
  const toastTimer = useRef<number | null>(null)
  const restoreRef = useRef<(() => void) | null>(null)

  function showToast(message: string, kind: Toast['kind']) {
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    setToast({ message, kind })
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const doneCount = tasks.filter((t) => t.done).length
  const progress = tasks.length === 0 ? 0 : Math.round((doneCount / tasks.length) * 100)

  function addTask() {
    const text = draft.trim()
    if (!text) {
      showToast('Task text cannot be empty', 'error')
      return
    }
    host.addTask(text)
    setDraft('')
    setTasks(refresh())
  }

  function toggleDone(task: Task) {
    host.setDone(task.id, !task.done)
    setTasks(refresh())
  }

  function startEdit(task: Task) {
    setEditingId(task.id)
    setEditingText(task.text)
  }

  function saveEdit() {
    if (editingId === null) return
    const text = editingText.trim()
    if (text) host.updateTask(editingId, text)
    setEditingId(null)
    setEditingText('')
    setTasks(refresh())
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingText('')
  }

  function deleteTask(task: Task) {
    const index = tasks.findIndex((t) => t.id === task.id)
    const snapshot: Task = { ...task }
    host.removeTask(task.id)
    setTasks(refresh())
    restoreRef.current = () => {
      host.restoreTask(snapshot, index)
      setTasks(refresh())
      setToast(null)
      restoreRef.current = null
    }
    showToast('Task deleted', 'undo')
  }

  function undo() {
    if (restoreRef.current) restoreRef.current()
  }

  function move(id: string, direction: 'up' | 'down') {
    host.moveTask(id, direction)
    setTasks(refresh())
  }

  return (
    <main className="lc-page to-do-app">
      <h1 className="lc-title lc-title-lg">Task List</h1>

      <Card mono="Progress" title={`${progress}% complete`}>
        <div
          className="to-do-progress"
          role="progressbar"
          aria-label="Progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          style={{ ['--to-do-progress' as string]: `${progress}%` }}
        />
      </Card>

      <Card>
        <Stack>
          <label className="lc-field">
            <span className="lc-field-label">New task</span>
            <input
              className="lc-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addTask()
                }
              }}
            />
          </label>

          {tasks.length === 0 ? (
            <div className="lc-empty">
              <div className="lc-empty-title">No tasks yet</div>
              <Body sm>Add a task above to get started.</Body>
            </div>
          ) : (
            <ul className="to-do-list" role="list">
              {tasks.map((task) => {
                const isEditing = editingId === task.id
                return (
                  <li
                    key={task.id}
                    tabIndex={0}
                    className={task.done ? 'to-do-item to-do-item-done' : 'to-do-item'}
                    onKeyDown={(event) => {
                      if (event.altKey && event.key === 'ArrowUp') {
                        event.preventDefault()
                        move(task.id, 'up')
                      } else if (event.altKey && event.key === 'ArrowDown') {
                        event.preventDefault()
                        move(task.id, 'down')
                      }
                    }}
                  >
                    {isEditing ? (
                      <input
                        className="to-do-edit-input"
                        aria-label={`Edit ${task.text}`}
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveEdit()
                          else if (event.key === 'Escape') cancelEdit()
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <input
                          type="checkbox"
                          className="to-do-item-check"
                          aria-label={task.text}
                          checked={task.done}
                          onChange={() => toggleDone(task)}
                        />
                        <span className="to-do-item-text">{task.text}</span>
                        <span className="to-do-item-actions">
                          <button type="button" aria-label="Edit" onClick={() => startEdit(task)}>
                            Edit
                          </button>
                          <button type="button" aria-label="Delete" onClick={() => deleteTask(task)}>
                            Delete
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Stack>
      </Card>

      {toast && (
        <div
          className={toast.kind === 'error' ? 'to-do-toast to-do-toast-error' : 'to-do-toast'}
          role={toast.kind === 'undo' ? 'status' : 'alert'}
        >
          <span className="to-do-toast-text">{toast.message}</span>
          {toast.kind === 'undo' && (
            <button type="button" className="to-do-toast-undo" aria-label="Undo" onClick={undo}>
              Undo
            </button>
          )}
        </div>
      )}
    </main>
  )
}
