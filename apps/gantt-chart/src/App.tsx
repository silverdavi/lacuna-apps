// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, TextInput } from '@lacuna/ui'
import { GanttBars, type GanttBar } from '@lacuna/gantt-bars'
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'
import { useLocalRecord } from '@lacuna/use-local-record'
import './app.css'

interface Task {
  id: string
  name: string
  start: string
  duration: number
  dependsOn: string[]
}

function nextId(tasks: Task[]): string {
  let n = tasks.length
  for (const t of tasks) {
    const m = /^task-(\d+)$/.exec(t.id)
    if (m) n = Math.max(n, Number(m[1]))
  }
  return `task-${n + 1}`
}

function toBar(t: Task): GanttBar {
  const s = fromISODate(t.start)
  const e = s ? addDays(s, Math.max(0, t.duration - 1)) : null
  return {
    id: t.id,
    label: t.name,
    start: t.start,
    end: e ? toISODate(e) : t.start,
    dependsOn: t.dependsOn,
  }
}

function endDate(t: Task): string {
  const s = fromISODate(t.start)
  const e = s ? addDays(s, Math.max(0, t.duration - 1)) : null
  return e ? toISODate(e) : t.start
}

export function App() {
  const { value: tasks, set: setTasks } = useLocalRecord<Task[]>({
    key: 'lacuna.gantt-chart.tasks',
    version: 1,
    defaultValue: [],
  })
  const [tab, setTab] = useState<'Timeline' | 'Dependencies'>('Timeline')
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState('1')
  const [error, setError] = useState<string | null>(null)

  const bars: GanttBar[] = useMemo(() => tasks.map(toBar), [tasks])

  function onBarsChange(next: GanttBar[]) {
    setTasks((prev) =>
      prev.map((t) => {
        const bar = next.find((b) => b.id === t.id)
        if (!bar || bar.start === t.start) return t
        const s = fromISODate(bar.start)
        if (!s) return t
        return { ...t, start: toISODate(s) }
      }),
    )
  }

  function openForm() {
    setName('')
    setStart(toISODate(new Date()))
    setDuration('1')
    setError(null)
    setFormOpen(true)
  }

  function saveTask() {
    const n = name.trim()
    const days = Number(duration)
    const s = fromISODate(start)
    if (!n) return setError('Give the task a name')
    if (!s) return setError('Pick a valid start date')
    if (!Number.isInteger(days) || days < 1) return setError('Duration must be a whole number of days')
    setTasks((prev) => [...prev, { id: nextId(prev), name: n, start, duration: days, dependsOn: [] }])
    setFormOpen(false)
    setError(null)
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => d !== id) })))
  }

  function setPredecessor(taskId: string, predId: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, dependsOn: predId === '' ? [] : Array.from(new Set([...t.dependsOn, predId])) }
          : t,
      ),
    )
  }

  function exportText() {
    const text = tasks
      .map((t) => `${t.name}: ${t.start} to ${endDate(t)}`)
      .join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const bar = document.getElementById('gantt-export-status')
        if (bar) bar.textContent = `Copied ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} to the clipboard`
      })
      .catch(() => {
        const bar = document.getElementById('gantt-export-status')
        if (bar) bar.textContent = 'Clipboard is unavailable here'
      })
  }

  return (
    <AppShell
      name="Gantt Chart"
      icon="grid"
      hue="cobalt"
      category="Productivity"
      meta={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
    >
      <div className="gc-toolbar">
        <div className="gc-tabs" role="tablist" aria-label="Views">
          {(['Timeline', 'Dependencies'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="gc-tab"
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="gc-actions">
          <Button kind="secondary" onClick={exportText}>
            Export
          </Button>
          <Button kind="primary" onClick={openForm}>
            Add task
          </Button>
        </div>
      </div>

      {tab === 'Timeline' ? (
        <div role="tabpanel" aria-label="Timeline">
          <Card mono={`${bars.length} bars`} title="Timeline">
            {tasks.length === 0 ? (
              <EmptyState
                mono="0"
                title="No tasks yet"
                detail="Add the first task to draw the timeline."
                actionLabel="Add a task"
                onAction={openForm}
              />
            ) : (
              <>
                <GanttBars
                  bars={bars}
                  onBarsChange={onBarsChange}
                  width={760}
                  height={Math.max(120, tasks.length * 32 + 16)}
                  dayWidth={6}
                />
                <table className="gc-tasks" aria-label="Task dates">
                  <thead>
                    <tr>
                      <th>Start</th>
                      <th>End</th>
                      <th>Duration</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t, i) => (
                      <tr key={t.id}>
                        <td className="gc-mono">{t.start}</td>
                        <td className="gc-mono">{endDate(t)}</td>
                        <td className="gc-mono">{t.duration}d</td>
                        <td className="gc-mono">
                          {i === tasks.length - 1 ? (
                            <Button kind="ghost" onClick={() => removeTask(t.id)}>
                              Delete
                            </Button>
                          ) : (
                            <span className="gc-mono-faint">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'Dependencies' ? (
        <div role="tabpanel" aria-label="Dependencies">
          <Card mono={`${tasks.length} tasks`} title="Dependencies">
            {tasks.length === 0 ? (
              <EmptyState
                mono="0"
                title="No tasks yet"
                detail="Add tasks to link them."
                actionLabel="Add a task"
                onAction={openForm}
              />
            ) : (
              <table className="gc-tasks" aria-label="Task dependencies">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Predecessor</th>
                    <th>Apply</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="gc-name">{t.name}</td>
                      <td>
                        <select
                          className="gc-pre"
                          aria-label="Predecessor"
                          value={t.dependsOn[0] ?? ''}
                          onChange={(ev) => setPredecessor(t.id, ev.target.value)}
                        >
                            <option value="">none</option>
                          {tasks
                            .filter((o) => o.id !== t.id)
                            .map((o) => (
                              <option key={o.id} value={o.id} label={o.name}>
                                {o.id}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <Button
                          kind="secondary"
                          disabled={t.dependsOn.length === 0}
                          onClick={() => setPredecessor(t.id, t.dependsOn[0] ?? '')}
                        >
                          Apply
                        </Button>
                      </td>
                      <td className="gc-mono">
                        <Button kind="ghost" onClick={() => removeTask(t.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      ) : null}

      {formOpen ? (
        <div className="gc-overlay" role="dialog" aria-modal="true" aria-label="Add task">
          <div className="gc-dialog">
            <h2>Add task</h2>
            <FormGrid>
              <TextInput label="Task name" value={name} onChange={setName} />
              <TextInput label="Start date" type="date" value={start} onChange={setStart} />
              <TextInput label="Duration (days)" type="number" value={duration} onChange={setDuration} />
            </FormGrid>
            {error ? (
              <p role="alert" className="gc-error">
                {error}
              </p>
            ) : null}
            <div className="gc-actions">
              <Button kind="primary" onClick={saveTask}>
                Save
              </Button>
              <Button kind="ghost" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div id="gantt-export-status" role="status" className="gc-status" />
    </AppShell>
  )
}
