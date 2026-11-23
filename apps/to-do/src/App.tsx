// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  PrimaryButton,
  Rail,
  Row,
  TextInput,
  Title,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { exportBackup, importBackup } from '@lacuna/json-backup'

type TaskData = { text: string; done: boolean }

const STORAGE_KEY = 'lacuna.to-do.tasks'
const APP_ID = 'lacuna.to-do'

function Progress({ total, done }: { total: number; done: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div
      role="progressbar"
      aria-label="Progress"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        width: '100%',
        height: 8,
        borderRadius: 4,
        background: 'var(--ink-10)',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)' }} />
    </div>
  )
}

export function App() {
  const { state, actions } = useCollection<TaskData>({ storageKey: STORAGE_KEY })
  const tasks = state.items.map((item) => ({ id: item.id, ...item.data }))

  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [lastDeleted, setLastDeleted] = useState<{ index: number; id: string; data: TaskData } | null>(null)
  const [paste, setPaste] = useState('')
  const [importResult, setImportResult] = useState<string | null>(null)
  const [exported, setExported] = useState<string | null>(null)

  const total = tasks.length
  const done = tasks.filter((task) => task.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  function addTask() {
    const next = text.trim()
    if (!next) {
      setError('Task text cannot be empty')
      return
    }
    setError(null)
    actions.add({ text: next, done: false })
    setText('')
  }

  function commitEdit() {
    if (editingId === null) return
    const next = editText.trim()
    if (!next) {
      setEditText(tasks.find((task) => task.id === editingId)?.text ?? '')
      setEditingId(null)
      return
    }
    actions.update(editingId, { text: next })
    setEditingId(null)
    setEditText('')
  }

  function removeTask(id: string) {
    const index = tasks.findIndex((task) => task.id === id)
    if (index === -1) return
    const data = tasks[index]
    actions.remove(id)
    setLastDeleted({ index, id, data })
    setToast('Task deleted')
  }

  function undoDelete() {
    if (lastDeleted === null) return
    const { index, data } = lastDeleted
    // The restored task lands at the end (tasks.length); move it back to its original slot.
    actions.add(data)
    if (index < tasks.length) actions.reorder(tasks.length, index)
    setLastDeleted(null)
    setToast(null)
  }

  function reorderTask(id: string, direction: -1 | 1) {
    const index = tasks.findIndex((task) => task.id === id)
    if (index === -1) return
    const target = index + direction
    if (target < 0 || target >= total) return
    actions.reorder(index, target)
  }

  function onImport() {
    const value = paste.trim()
    if (!value) {
      setImportResult('Paste a backup JSON first.')
      return
    }
    try {
      const result = importBackup<TaskData>(value, {
        currentVersion: 1,
        validate: (record) =>
          typeof record.data.text === 'string' && typeof record.data.done === 'boolean' ? null : 'Task is malformed',
      })
      for (const record of result.records) {
        actions.add(record.data)
      }
      setImportResult(
        `Imported ${result.records.length} task${result.records.length === 1 ? '' : 's'}${
          result.droppedCount > 0 ? `, dropped ${result.droppedCount}` : ''
        }.`,
      )
      setPaste('')
    } catch {
      setImportResult('That is not a valid backup JSON.')
    }
  }

  const exportOptions: ExportOption[] = total > 0
    ? [
        {
          id: 'csv',
          label: 'Tasks CSV',
          mimeType: 'text/csv',
          extension: 'csv',
          getData: () => ['text,done', ...tasks.map((task) => `${task.text},${task.done}`)].join('\n'),
        },
        {
          id: 'json',
          label: 'Backup JSON',
          mimeType: 'application/json',
          extension: 'json',
          getData: () =>
            exportBackup({
              appId: APP_ID,
              version: 1,
              records: state.items.map((item) => ({
                id: item.id,
                data: item.data,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              })),
            }),
        },
      ]
    : []

  return (
    <AppShell
      name="Task List"
      icon="tasks"
      hue="blue"
      category="Productivity"
      meta={`${total} ${total === 1 ? 'task' : 'tasks'}`}
      status="Saved on this device"
      side={
        <Rail title="Task List" note="Personal · local" chips={['Check off', 'Reorder', 'Works offline']}>
          <MonoLabel faint>
            Add tasks, check them off, and keep the list in the order you need. It stays on this device.
          </MonoLabel>
        </Rail>
      }
    >
      <Title size="xl">Task List</Title>

      <Card mono="New" title="Add a task">
        <FormGrid>
          <label className="lc-field">
            <span className="lc-field-label">New task</span>
            <input
              className="lc-input"
              value={text}
              placeholder="What needs doing?"
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setText(event.target.value)
                if (error !== null) setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addTask()
              }}
            />
            {error ? (
              <span className="lk-field-error" role="alert">
                {error}
              </span>
            ) : null}
          </label>
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={addTask}>Add task</PrimaryButton>
        </Actions>
      </Card>

      <Card mono="Progress" title="Progress">
        <KpiRow>
          <Kpi label="Done" value={`Done: ${done}`} />
          <Kpi label="Open" value={`Open: ${total - done}`} />
          <Kpi label="Percent" value={`Percent: ${percent}%`} accent />
        </KpiRow>
        <div style={{ marginTop: 12 }}>
          <Progress total={total} done={done} />
        </div>
      </Card>

      <Card mono={`${total} saved`} title="Tasks">
        {total === 0 ? (
          <EmptyState mono="Empty" title="No tasks yet" detail="Add the first task above." />
        ) : (
          <List label="Tasks">
            {tasks.map((task, index) => (
              <Row
                key={task.id}
                title={
                  editingId === task.id ? (
                    <label
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      onKeyUp={(event) => {
                        if (!event.altKey) return
                        if (event.key === 'ArrowUp') reorderTask(task.id, -1)
                        else if (event.key === 'ArrowDown') reorderTask(task.id, 1)
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={task.text}
                        checked={task.done}
                        onChange={(event) => actions.update(task.id, { done: event.target.checked })}
                      />
                    </label>
                  ) : (
                    <label
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      onKeyUp={(event) => {
                        if (!event.altKey) return
                        if (event.key === 'ArrowUp') reorderTask(task.id, -1)
                        else if (event.key === 'ArrowDown') reorderTask(task.id, 1)
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={task.text}
                        checked={task.done}
                        onChange={(event) => actions.update(task.id, { done: event.target.checked })}
                      />
                      <span style={task.done ? { textDecorationLine: 'line-through' } : undefined}>
                        {task.text}
                      </span>
                    </label>
                  )
                }
                action={
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    <Button
                      kind="ghost"
                      ariaLabel={`Move ${task.text} up`}
                      title="Move up (Alt+ArrowUp)"
                      disabled={index === 0}
                      onClick={() => reorderTask(task.id, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      kind="ghost"
                      ariaLabel={`Move ${task.text} down`}
                      title="Move down (Alt+ArrowDown)"
                      disabled={index === total - 1}
                      onClick={() => reorderTask(task.id, 1)}
                    >
                      Down
                    </Button>
                    {editingId === task.id ? (
                      <>
                        <label className="lc-field">
                          <span className="lc-field-label">{`Edit ${task.text}`}</span>
                          <input
                            className="lc-input"
                            value={editText}
                            onChange={(event) => setEditText(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') commitEdit()
                            }}
                          />
                        </label>
                        <Button
                          kind="primary"
                          ariaLabel={`Save ${task.text}`}
                          onClick={commitEdit}
                        >
                          Save
                        </Button>
                      </>
                    ) : (
                      <Button
                        kind="ghost"
                        ariaLabel={`Edit ${task.text}`}
                        onClick={() => {
                          setEditingId(task.id)
                          setEditText(task.text)
                        }}
                      >
                        Edit {task.text}
                      </Button>
                    )}
                    <Button
                      kind="ghost"
                      ariaLabel={`Delete ${task.text}`}
                      onClick={() => removeTask(task.id)}
                    >
                      Delete {task.text}
                    </Button>
                  </span>
                }
              />
            ))}
          </List>
        )}
      </Card>

      <Card mono="Backup" title="Export and import">
        {importResult ? <p role="status">{importResult}</p> : null}
        {exported ? <p role="status">{exported}</p> : null}
        {total === 0 ? (
          <EmptyState title="Nothing to export yet" detail="Add a task, then export it here." />
        ) : (
          <ExportMenu
            options={exportOptions}
            fileName="to-do"
            ariaLabel="Export tasks"
            onExport={(id) => setExported(`Exported ${id === 'csv' ? 'CSV' : 'backup'}.`)}
          />
        )}
        <FormGrid>
          <TextInput
            label="Import a backup"
            value={paste}
            onChange={setPaste}
            rows={3}
            placeholder='Paste a backup JSON, e.g. {"appId":"lacuna.to-do",...}'
          />
        </FormGrid>
        <Actions>
          <Button kind="secondary" onClick={onImport}>Import backup</Button>
        </Actions>
      </Card>

      {toast !== null && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0.5rem 0.75rem',
            borderRadius: 8,
            background: 'var(--ink)',
            color: 'var(--ink-100)',
          }}
        >
          <span>{toast}</span>
          <Button kind="primary" ariaLabel="Undo" onClick={undoDelete}>
            Undo
          </Button>
        </div>
      )}
    </AppShell>
  )
}
