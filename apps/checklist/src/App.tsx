import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  Stack,
} from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { FilterBar } from '@lacuna/filter-bar'
import { TagInput } from '@lacuna/tag-input'
import { exportBackup, importBackup, type BackupRecord } from '@lacuna/json-backup'
import { createMockValue } from '@lacuna/host-mock'
import { isTaskRecord, type TaskRecord } from './host'

type Task = Omit<TaskRecord, 'id'>

const APP_ID = 'lacuna.checklist'
const APP_VERSION = 1

const HISTORY_KEY = 'lacuna.checklist.history'
const TAGS_KEY = 'lacuna.checklist.tags'

interface HistoryEvent {
  id: string
  text: string
  action: string
  done: boolean
}

function isHistoryEventArray(value: unknown): value is HistoryEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as HistoryEvent).id === 'string' &&
        typeof (e as HistoryEvent).text === 'string',
    )
  )
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((t) => typeof t === 'string')
}

const historyStore = createMockValue<HistoryEvent[]>({
  key: HISTORY_KEY,
  fallback: [],
  validate: isHistoryEventArray,
})

const tagsStore = createMockValue<string[]>({
  key: TAGS_KEY,
  fallback: [],
  validate: isStringArray,
})

function pushHistory(event: Omit<HistoryEvent, 'id'>): HistoryEvent[] {
  const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const events = [...historyStore.get(), { ...event, id }]
  historyStore.set(events.slice(-100))
  return events.slice(-100)
}

function toMarkdown(tasks: TaskRecord[]): string {
  return tasks.map((t) => `- [${t.done ? 'x' : ' '}] ${t.text}`).join('\n')
}

type Status = 'open' | 'done'
type SortChoice = 'By status' | 'By name'

const SORT_OPTIONS: { field: string; direction: 'asc' | 'desc'; label: SortChoice }[] = [
  { field: 'status', direction: 'asc', label: 'By status' },
  { field: 'text', direction: 'asc', label: 'By name' },
]

const filterChips = [
  { key: 'open', label: 'Open', field: 'status', value: 'open' },
  { key: 'done', label: 'Done', field: 'status', value: 'done' },
]

export function App() {
  const { state, actions } = useCollection<Task>({ storageKey: 'lacuna.checklist.tasks' })
  const tasks = useMemo(
    () => state.items.map((item) => ({ id: item.id, ...item.data })),
    [state.items],
  )
  const done = tasks.filter((t) => t.done).length

  const [tab, setTab] = useState<'Tasks' | 'History'>('Tasks')
  const [history, setHistory] = useState<HistoryEvent[]>(() => historyStore.get())
  const [activeChips, setActiveChips] = useState<string[]>([])
  const [sortLabel, setSortLabel] = useState<SortChoice>('By status')
  const [exportNote, setExportNote] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [paste, setPaste] = useState('')
  const [newTask, setNewTask] = useState('')

  const { copy } = useClipboard()

  useEffect(() => {
    setHistory(historyStore.get())
  }, [])

  const onAdd = useCallback(() => {
    const text = newTask.trim()
    if (!text) return
    actions.add({ text, done: tasks.length > 0, tags: [] })
    setHistory(pushHistory({ text, action: 'added', done: tasks.length > 0 }))
    setNewTask('')
  }, [actions, newTask, tasks.length])

  const onToggle = useCallback(
    (id: string, checked: boolean) => {
      const task = tasks.find((t) => t.id === id)
      actions.update(id, { done: checked })
      if (task) {
        setHistory(
          pushHistory({
            text: task.text,
            action: checked ? 'checked' : 'unchecked',
            done: checked,
          }),
        )
      }
    },
    [actions, tasks],
  )

  const onTagChange = useCallback(
    (id: string, tags: string[]) => {
      actions.update(id, { tags })
      const merged = [...new Set([...tagsStore.get(), ...tags])]
      tagsStore.set(merged)
    },
    [actions],
  )

  const onDelete = useCallback(
    (id: string) => {
      const task = tasks.find((t) => t.id === id)
      actions.remove(id)
      if (task) setHistory(pushHistory({ text: task.text, action: 'deleted', done: task.done }))
    },
    [actions, tasks],
  )

  const onReorder = useCallback(
    (index: number, delta: number) => {
      const to = index + delta
      if (to < 0 || to >= tasks.length) return
      actions.reorder(index, to)
    },
    [actions, tasks],
  )

  const onCopyMarkdown = useCallback(async () => {
    await copy(toMarkdown(tasks))
  }, [copy, tasks])

  const exportOptions = useMemo<ExportOption[]>(
    () => [
      {
        id: 'markdown',
        label: 'Markdown (.md)',
        mimeType: 'text/markdown',
        extension: 'md',
        getData: () => toMarkdown(tasks),
      },
      {
        id: 'json',
        label: 'Backup (JSON)',
        mimeType: 'application/json',
        extension: 'json',
        getData: () => {
          const now = Date.now()
          const records: BackupRecord<Task>[] = tasks.map((t) => ({
            id: t.id,
            data: { text: t.text, done: t.done, tags: t.tags ?? [] },
            createdAt: now,
            updatedAt: now,
          }))
          return exportBackup<Task>({ appId: APP_ID, version: APP_VERSION, records })
        },
      },
    ],
    [tasks],
  )

  const onImport = useCallback(() => {
    const text = paste.trim()
    if (!text) {
      setImportResult('Paste a backup JSON first.')
      return
    }
    try {
      const result = importBackup<Task>(text, {
        currentVersion: APP_VERSION,
        validate: (record) =>
          isTaskRecord({ id: record.id, ...record.data }) ? null : 'Task is malformed',
      })
      let imported = 0
      for (const record of result.records) {
        actions.add({ text: record.data.text, done: record.data.done, tags: record.data.tags ?? [] })
        imported++
      }
      setImportResult(`Imported ${imported} task${imported === 1 ? '' : 's'}.`)
      setPaste('')
    } catch {
      setImportResult('Import failed: not valid backup JSON.')
    }
  }, [paste, actions])

  const visible = useMemo(() => {
    let out = tasks.map((t) => ({
      ...t,
      tags: t.tags ?? [],
      status: (t.done ? 'done' : 'open') as Status,
    }))
    for (const chip of filterChips) {
      if (activeChips.includes(chip.key)) {
        out = out.filter((t) => t.status === chip.value)
      }
    }
    if (sortLabel === 'By name') {
      out = [...out].sort((a, b) => a.text.localeCompare(b.text))
    }
    return out
  }, [tasks, activeChips, sortLabel])

  const suggestionTags = useMemo(() => {
    const known = tagsStore.get()
    const fromTasks = new Set<string>()
    for (const t of tasks) for (const tag of t.tags ?? []) fromTasks.add(tag)
    const extras = known.filter((tag) => !fromTasks.has(tag))
    return [...fromTasks, ...extras]
  }, [tasks])

  return (
    <AppShell
      name="Checklist App"
      icon="tasks"
      hue="gold"
      category="Productivity"
      meta={tasks.length ? `${tasks.length} item${tasks.length === 1 ? '' : 's'}` : undefined}
      status={tab === 'History' ? `${history.length} event${history.length === 1 ? '' : 's'}` : undefined}
      side={
        <Rail title="Progress">
          <KpiRow>
            <Kpi value={tasks.length} label="Tasks" />
            <Kpi value={done} label="Done" accent={done > 0} />
            <Kpi value={tasks.length - done} label="Open" />
          </KpiRow>
          <MonoLabel>Export</MonoLabel>
          <ExportMenu
            options={exportOptions}
            fileName="checklist"
            ariaLabel="Export checklist"
            disabled={tasks.length === 0}
            onExport={() => {
              setExportNote('Exported.')
              setExportError(null)
            }}
            onError={(id, error) => {
              setExportNote(null)
              setExportError(`Export ${id} failed: ${error.message}`)
            }}
          />
          {exportNote ? <p role="status">{exportNote}</p> : null}
          {exportError ? <p role="alert">{exportError}</p> : null}
        </Rail>
      }
    >
      <div role="tablist" aria-label="Checklist views" className="lc-tabs">
        {(['Tasks', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <Card
        title="Tasks"
        mono="Task list"
      >
          <form
            aria-label="Add a new item"
            style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}
            onSubmit={(event) => {
              event.preventDefault()
              onAdd()
            }}
          >
            <label htmlFor="checklist-new-task" style={{ fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
              Task
            </label>
            <input
              id="checklist-new-task"
              type="text"
              value={newTask}
              onChange={(event) => setNewTask(event.target.value)}
              placeholder="What needs doing?"
              style={{
                flex: 1,
                boxSizing: 'border-box',
                fontFamily: 'var(--sans)',
                fontSize: 'calc(14px * var(--tf))',
                color: 'var(--ink)',
                background: 'var(--paper)',
                border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                borderRadius: 'calc(4px * var(--sf))',
                padding: 'calc(8px * var(--sf))',
              }}
            />
            <Button kind="primary" type="submit" disabled={newTask.trim() === ''}>
              Add task
            </Button>
          </form>
          <Stack>
            <KpiRow>
              <Kpi value={`${done} of ${tasks.length} done`} label="Progress" accent={done > 0} />
            </KpiRow>
            <FilterBar
              chips={filterChips}
              activeChips={activeChips}
              onChipsChange={setActiveChips}
              sortOptions={SORT_OPTIONS}
              sort={SORT_OPTIONS.find((o) => o.label === sortLabel) ?? SORT_OPTIONS[0]}
              onSortChange={(next) => setSortLabel(next.label as SortChoice)}
            />
            {tasks.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No tasks yet"
                detail="Add your first task with the form above."
                actionLabel="Add task"
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {visible.map((record) => {
                  const index = tasks.findIndex((t) => t.id === record.id)
                  return (
                    <li key={record.id} data-task-row={record.text}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                        <input
                          type="checkbox"
                          checked={record.done}
                          aria-label={`${record.text} done`}
                          onChange={(event) => onToggle(record.id, event.target.checked)}
                        />
                        <span style={{ flexGrow: 1, fontSize: 'calc(14px * var(--tf))', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
                          {record.text}
                        </span>
                        <button
                          type="button"
                          data-reorder-handle={record.text}
                          aria-label={`Move ${record.text} down`}
                          onClick={() => onReorder(index, 1)}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                              event.preventDefault()
                              onReorder(index, 1)
                            } else if (event.key === 'ArrowUp') {
                              event.preventDefault()
                              onReorder(index, -1)
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                            borderRadius: 'calc(4px * var(--sf))',
                            padding: 'calc(2px * var(--sf)) calc(8px * var(--sf))',
                            cursor: 'pointer',
                            color: 'var(--ink)',
                            fontFamily: 'var(--sans)',
                            fontSize: 'calc(12px * var(--tf))',
                          }}
                        >
                          Move
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', marginTop: 'calc(4px * var(--sf))' }}>
                        <TagInput
                          tags={record.tags}
                          onChange={(tags) => onTagChange(record.id, tags)}
                          suggestions={suggestionTags}
                          placeholder="Tag"
                          aria-label={`Tags for ${record.text}`}
                        />
                        <Button
                          kind="ghost"
                          aria-label={`Delete ${record.text}`}
                          onClick={() => onDelete(record.id)}
                        >
                          Delete {record.text}
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Stack>
      </Card>

      <Card title="History" mono="Events">
        {history.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No history yet"
            detail="Add or complete a task and its events will show up here."
            actionLabel="Go to tasks"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }} aria-label="History">
            {history.map((event) => (
              <div key={event.id} role="group" style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                <span style={{ flexGrow: 1, fontSize: 'calc(14px * var(--tf))', fontFamily: 'var(--sans)', color: 'var(--ink)' }}>
                  {event.text}
                </span>
                <MonoLabel>{event.action}</MonoLabel>
                <MonoLabel sm>{event.done ? 'done' : 'open'}</MonoLabel>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card mono="Backup" title="Import">
        {importResult ? <p role="status">{importResult}</p> : null}
        <Stack>
          <label htmlFor="checklist-import-input">Import a backup</label>
          <textarea
            id="checklist-import-input"
            rows={3}
            value={paste}
            onChange={(event) => setPaste(event.target.value)}
            placeholder='Paste a backup JSON, e.g. {"appId":"lacuna.checklist",...}'
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(14px * var(--tf))',
              color: 'var(--ink)',
              background: 'var(--paper)',
              border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
              borderRadius: 'calc(4px * var(--sf))',
              padding: 'calc(8px * var(--sf))',
            }}
          />
          <Button kind="secondary" onClick={onImport}>Import backup</Button>
          <Button kind="secondary" onClick={onCopyMarkdown} disabled={tasks.length === 0}>
            Copy as Markdown
          </Button>
        </Stack>
      </Card>
    </AppShell>
  )
}
