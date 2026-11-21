import React, { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { openFile, saveText } from '@lacuna/file-save-open'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import {
  Actions,
  AppShell,
  Body,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Pills,
  Select,
  Stack,
  Table,
  Tag,
  TextInput,
  Button,
} from '@lacuna/ui'
import {
  issues,
  ISSUE_TYPES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type Issue,
  type IssuePriority,
  type IssueStatus,
  type IssueType,
} from './host/mock'
import './app.css'

type SortKey = 'title' | 'type' | 'priority' | 'assignee' | 'status'
type SortDir = 'asc' | 'desc'
type TypeFilter = 'all' | IssueType
type StatusFilter = 'all' | IssueStatus

const PRIORITY_RANK: Record<IssuePriority, number> = { Low: 0, Medium: 1, High: 2 }



interface Draft {
  title: string
  type: IssueType
  priority: IssuePriority
  assignee: string
  status: IssueStatus
}

const EMPTY_DRAFT: Draft = {
  title: '',
  type: 'Bug',
  priority: 'Medium',
  assignee: '',
  status: 'Open',
}

interface BackupRecord {
  title: string
  type: string
  priority: string
  assignee: string
  status: string
}

function sortValue(issue: Issue, key: SortKey): string | number {
  if (key === 'priority') return PRIORITY_RANK[issue.priority]
  if (key === 'assignee') return issue.assignee.toLowerCase()
  return String(issue[key]).toLowerCase()
}

function csvText(items: Issue[]): string {
  return toCsv([
    ['Title', 'Type', 'Priority', 'Assignee', 'Status'],
    ...items.map((i) => [i.title, i.type, i.priority, i.assignee, i.status]),
  ])
}

function backupRecords(items: Issue[]) {
  return items.map((issue) => ({
    id: issue.id,
    data: {
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      assignee: issue.assignee,
      status: issue.status,
    } satisfies BackupRecord,
    createdAt: 0,
    updatedAt: 0,
  }))
}

function isBackupData(record: BackupRecord): string | null {
  const ok =
    typeof record.title === 'string' &&
    (ISSUE_TYPES as readonly string[]).includes(record.type) &&
    (ISSUE_PRIORITIES as readonly string[]).includes(record.priority) &&
    typeof record.assignee === 'string' &&
    (ISSUE_STATUSES as readonly string[]).includes(record.status)
  return ok ? null : 'not an issue record'
}

export function App() {
  const [items, setItems] = useState<Issue[]>(() => issues.list())
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!note && !error) return
    const t = setTimeout(() => {
      setNote('')
      setError('')
    }, 4000)
    return () => clearTimeout(t)
  }, [note, error])

  const refresh = () => setItems(issues.list())

  const lastId = items.length > 0 ? items[items.length - 1].id : null
  const targetId = editingId ?? selectedId ?? lastId
  const target = items.find((i) => i.id === targetId) ?? items[items.length - 1]

  const openCount = items.filter((i) => i.status === 'Open').length
  const progressCount = items.filter((i) => i.status === 'In Progress').length
  const bugCount = items.filter((i) => i.type === 'Bug').length
  const doneCount = items.filter((i) => i.status === 'Done').length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      if (q && !i.title.toLowerCase().includes(q)) return false
      if (typeFilter !== 'all' && i.type !== typeFilter) return false
      if (statusFilter !== 'all' && i.status !== statusFilter) return false
      return true
    })
  }, [items, search, typeFilter, statusFilter])

  const visible = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey)
      const vb = sortValue(b, sortKey)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const startEdit = (issue: Issue) => {
    setDraft({
      title: issue.title,
      type: issue.type,
      priority: issue.priority,
      assignee: issue.assignee,
      status: issue.status,
    })
    setEditingId(issue.id)
    setSelectedId(issue.id)
    setFormOpen(true)
    setError('')
  }

  const openNewForm = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFormOpen(true)
    setError('')
  }

  const cancelForm = () => {
    setDraft(EMPTY_DRAFT)
    setEditingId(null)
    setFormOpen(false)
    setError('')
  }

  const save = () => {
    const title = draft.title.trim()
    if (!title) {
      setError('Title is required')
      return
    }
    const patch = {
      title,
      type: draft.type,
      priority: draft.priority,
      assignee: draft.assignee.trim(),
      status: draft.status,
    }
    if (editingId) {
      issues.update(editingId, patch)
      setNote('Issue updated')
      setEditingId(null)
    } else {
      issues.add(patch)
      setNote('Issue added')
    }
    setDraft(EMPTY_DRAFT)
    setFormOpen(false)
    setError('')
    refresh()
  }

  const removeTarget = () => {
    if (!target) return
    issues.remove(target.id)
    if (editingId === target.id) {
      setEditingId(null)
      setDraft(EMPTY_DRAFT)
      setFormOpen(false)
    }
    if (selectedId === target.id) setSelectedId(null)
    setNote('Issue deleted')
    refresh()
  }

  const exportOptions = useMemo<ExportOption[]>(
    () => [
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => csvText(items),
      },
      {
        id: 'json',
        label: 'Backup (JSON)',
        mimeType: 'application/json',
        extension: 'json',
        getData: () =>
          exportBackup<BackupRecord>({
            appId: 'issue-tracker',
            version: 1,
            records: backupRecords(items),
          }),
      },
    ],
    [items],
  )

  const onExport = (id: string) => setNote(id === 'csv' ? 'CSV exported' : 'Backup exported')

  const onImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setError(`Could not read ${file.name}: ${result.error}`)
      return
    }
    try {
      const imported = importBackup<BackupRecord>(JSON.stringify(result.data), {
        currentVersion: 1,
        validate: (record) => isBackupData(record.data),
      })
      const existing = new Set(issues.list().map((i) => i.id))
      let added = 0
      for (const record of imported.records) {
        if (existing.has(record.id)) continue
        const data = record.data
        issues.add({
          title: data.title,
          type: data.type as IssueType,
          priority: data.priority as IssuePriority,
          assignee: data.assignee,
          status: data.status as IssueStatus,
        })
        added += 1
      }
      refresh()
      if (imported.droppedCount > 0) setError(`Imported ${added} issue(s); dropped ${imported.droppedCount} invalid record(s)`)
      else if (added === 0) setNote('Nothing new to import')
      else setNote(`Imported ${added} issue(s)`)
    } catch {
      setError('Could not import that file; the list is unchanged')
    }
  }

  const columns: { key: string; label: React.ReactNode }[] = [
    { key: 'title', label: <button type="button" className="it-sort" onClick={() => toggleSort('title')}>Title{sortKey === 'title' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button> },
    { key: 'type', label: <button type="button" className="it-sort" onClick={() => toggleSort('type')}>Type{sortKey === 'type' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button> },
    { key: 'priority', label: <button type="button" className="it-sort" onClick={() => toggleSort('priority')}>Priority{sortKey === 'priority' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button> },
    { key: 'assignee', label: <button type="button" className="it-sort" onClick={() => toggleSort('assignee')}>Assignee{sortKey === 'assignee' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button> },
    { key: 'status', label: <button type="button" className="it-sort" onClick={() => toggleSort('status')}>Status{sortKey === 'status' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}</button> },
  ]

  const rowCells = (i: Issue) => ({
    title: i.title,
    type: <Tag>{i.type}</Tag>,
    priority: <Tag accent={i.priority === 'High'}>{i.priority}</Tag>,
    assignee: i.assignee || '—',
    status: <Tag accent={i.status === 'Open'}>{i.status}</Tag>,
  })

  return (
    <AppShell
      name="Bug Issue Tracker"
      icon="tasks"
      hue="teal"
      category="Productivity"
      meta={`${items.length} ${items.length === 1 ? 'issue' : 'issues'}`}
      status="Saved on this device"
      actions={
        <div className="it-toolbar">
          <Button kind="primary" onClick={openNewForm}>
            New issue
          </Button>
          <Button
            kind="secondary"
            onClick={() => saveText(csvText(items), { filename: 'issues.csv', mimeType: 'text/csv' })}
          >
            Export CSV
          </Button>
          <ExportMenu options={exportOptions} fileName="issues" ariaLabel="Export" onExport={onExport} onError={(id, e) => setError(`Export ${id} failed: ${e.message}`)} />
        </div>
      }
    >
      <Stack lg>
        <KpiRow>
          <Kpi label="Total" value={items.length} accent />
          <Kpi label="Open" value={openCount} />
          <Kpi label="In progress" value={progressCount} />
          <Kpi label="Bugs" value={bugCount} />
          <Kpi label="Done" value={doneCount} />
        </KpiRow>

        {formOpen && (
        <Card
          mono={editingId ? 'Edit' : 'New'}
          title={editingId ? 'Edit issue' : 'New issue'}
          actions={
            editingId ? (
              <Button kind="ghost" onClick={cancelForm}>
                Cancel
              </Button>
            ) : undefined
          }
        >
          <FormGrid>
            <TextInput
              label="Title"
              value={draft.title}
              onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
              placeholder="What needs tracking?"
            />
            <Select
              label="Type"
              value={draft.type}
              options={ISSUE_TYPES.map((v) => ({ value: v, label: v }))}
              onChange={(v) => setDraft((d) => ({ ...d, type: v as IssueType }))}
            />
            <Select
              label="Priority"
              value={draft.priority}
              options={ISSUE_PRIORITIES.map((v) => ({ value: v, label: v }))}
              onChange={(v) => setDraft((d) => ({ ...d, priority: v as IssuePriority }))}
            />
            <Select
              label="Status"
              value={draft.status}
              options={ISSUE_STATUSES.map((v) => ({ value: v, label: v }))}
              onChange={(v) => setDraft((d) => ({ ...d, status: v as IssueStatus }))}
            />
            <TextInput
              label="Assignee"
              value={draft.assignee}
              onChange={(v) => setDraft((d) => ({ ...d, assignee: v }))}
              placeholder="Who owns it?"
            />
          </FormGrid>
          <div style={{ marginTop: 'calc(var(--gap) / 2)' }}>
            <Actions>
              <Button kind="primary" onClick={save}>
                Save
              </Button>
            </Actions>
          </div>
        </Card>
        )}

        <Card mono="Filter" title="Narrow the list">
          <Stack style={{ gap: 'calc(var(--gap) / 2)' }}>
            <div className="it-filter">
              <MonoLabel sm>Type</MonoLabel>
              <Pills
                items={['All', ...ISSUE_TYPES]}
                active={typeFilter === 'all' ? 'All' : typeFilter}
                onSelect={(v) => {
                  const next = v === 'All' ? 'all' : (v as IssueType)
                  setTypeFilter(typeFilter === next ? 'all' : next)
                }}
              />
            </div>
            <div className="it-filter">
              <MonoLabel sm>Status</MonoLabel>
              <Pills
                items={['All', ...ISSUE_STATUSES]}
                active={statusFilter === 'all' ? 'All' : statusFilter}
                onSelect={(v) => {
                  const next = v === 'All' ? 'all' : (v as IssueStatus)
                  setStatusFilter(statusFilter === next ? 'all' : next)
                }}
              />
            </div>
            <TextInput label="Search" type="search" value={search} onChange={setSearch} placeholder="Filter by title" />
          </Stack>
        </Card>

        <Card mono="Board" title="Issues">
          {items.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No issues yet"
              detail="Add the first bug or feature with the New issue button above."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No matches"
              detail={`No issues match the current search or filters. ${items.length} ${items.length === 1 ? 'issue' : 'issues'} are hidden.`}
            />
          ) : (
            <>
              <Table
                label="Issues"
                columns={columns}
                rows={visible.map((i) => ({
                  hot: i.id === target?.id,
                  onClick: () => startEdit(i),
                  cells: rowCells(i),
                }))}
              />
              <div className="it-rowbar">
                <MonoLabel sm>
                  {target ? `Acting on: ${target.title}` : 'Select a row to act on it'}
                </MonoLabel>
                <div className="it-rowbar-btns">
                  <Button kind="ghost" onClick={() => target && startEdit(target)}>
                    Edit
                  </Button>
                  <Button kind="ghost" onClick={removeTarget}>
                    Delete
                  </Button>
                </div>
              </div>
            </>
          )}
          {(note || error) && (
            <div className="it-footer" role="status">
              {note ? <Tag accent>{note}</Tag> : null}
              {error ? <Tag>{error}</Tag> : null}
            </div>
          )}
        </Card>

        <Card mono="Backup" title="Backup & import">
          <Stack style={{ gap: 'calc(var(--gap) / 2)' }}>
            <Body>
              Export a versioned JSON backup, or import one to restore issues. Records already in the
              list are kept; duplicates by id are skipped.
            </Body>
            <div className="it-exports">
              <Button
                kind="secondary"
                onClick={() =>
                  saveText(
                    exportBackup<BackupRecord>({
                      appId: 'issue-tracker',
                      version: 1,
                      records: backupRecords(items),
                    }),
                    { filename: 'issue-tracker-backup.json', mimeType: 'application/json' },
                  )
                }
              >
                Export JSON
              </Button>
              <Button kind="secondary" onClick={() => fileRef.current?.click()}>
                Import JSON
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={onImportFile}
            />
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  )
}
