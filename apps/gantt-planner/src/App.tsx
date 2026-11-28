// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Pills,
  PrimaryButton,
  Rail,
  Row,
  Select,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { openFile, saveJSON, saveText } from '@lacuna/file-save-open'
import { toIcs } from '@lacuna/ics-calendar'
import { useUndoStack } from '@lacuna/use-undo-stack'
import {
  createProjectTemplate,
  formatShortDate,
  PROJECT_TEMPLATES,
  type GanttProject,
  type GanttTask,
  type ProjectTemplateId,
  type ZoomLevel,
} from './model'
import { computeSchedule } from './cpm'
import { GanttChart } from './GanttChart'
import { projectStore } from './host'

const ZOOM_ITEMS: ZoomLevel[] = ['Day', 'Week', 'Month']

export function App() {
  const initialProject = useMemo(() => projectStore.get(), [])
  const stack = useUndoStack<GanttProject>(initialProject, { limit: 50 })
  const project = stack.value

  const [zoom, setZoom] = useState<ZoomLevel>('Week')
  const [selectedId, setSelectedId] = useState<string | null>(project.tasks[0]?.id ?? null)
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false)
  const [phaseFilter, setPhaseFilter] = useState<string>('All')
  const [templateChoice, setTemplateChoice] = useState<ProjectTemplateId>('launch')
  const [notice, setNotice] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // New task form state
  const [newName, setNewName] = useState('')
  const [newPhase, setNewPhase] = useState('Engineering')
  const [newAssignee, setNewAssignee] = useState('Maya')
  const [newDuration, setNewDuration] = useState('4')
  const [newDep, setNewDep] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const jsonInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    projectStore.set(project)
  }, [project])

  const schedule = useMemo(() => computeSchedule(project), [project])

  const phases = useMemo(() => {
    const set = new Set<string>(['All'])
    for (const t of project.tasks) set.add(t.phase)
    return [...set]
  }, [project.tasks])

  const visibleTasks = useMemo(() => {
    return schedule.scheduled.filter((s) => {
      if (criticalOnly && !s.isCritical) return false
      if (phaseFilter !== 'All' && s.task.phase !== phaseFilter) return false
      return true
    })
  }, [schedule.scheduled, criticalOnly, phaseFilter])

  const selectedScheduled = selectedId ? schedule.byId.get(selectedId) ?? null : null

  function updateTask(id: string, patch: Partial<GanttTask>) {
    stack.set((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }

  function toggleDependency(taskId: string, depId: string) {
    const task = project.tasks.find((t) => t.id === taskId)
    if (!task) return
    const exists = task.dependencies.includes(depId)
    const nextDeps = exists
      ? task.dependencies.filter((d) => d !== depId)
      : [...task.dependencies, depId]
    updateTask(taskId, { dependencies: nextDeps })
    setNotice(exists ? `Removed dependency ${depId}` : `Linked ${depId} to ${taskId}`)
  }

  function handleAddTask() {
    const trimmed = newName.trim()
    if (!trimmed) {
      setFormError('Enter a task name')
      return
    }
    const dur = Number(newDuration)
    if (Number.isNaN(dur) || dur < 0 || dur > 365) {
      setFormError('Duration must be between 0 and 365 days')
      return
    }
    setFormError(null)
    let nextNum = project.tasks.length + 1
    while (project.tasks.some((t) => t.id === `T${nextNum}`)) nextNum++
    const id = `T${nextNum}`
    const task: GanttTask = {
      id,
      name: trimmed,
      phase: newPhase.trim() || 'General',
      assignee: newAssignee.trim() || 'Unassigned',
      startOffset: 0,
      duration: Math.round(dur),
      progress: 0,
      dependencies: newDep ? [newDep] : [],
    }
    stack.set((p) => ({ ...p, tasks: [...p.tasks, task] }))
    setSelectedId(id)
    setNewName('')
    setNotice(`Added task ${id}`)
  }

  function handleDeleteTask(id: string) {
    stack.set((p) => ({
      ...p,
      tasks: p.tasks
        .filter((t) => t.id !== id)
        .map((t) => ({ ...t, dependencies: t.dependencies.filter((d) => d !== id) })),
    }))
    if (selectedId === id) {
      const remaining = project.tasks.filter((t) => t.id !== id)
      setSelectedId(remaining[0]?.id ?? null)
    }
    setNotice(`Deleted task ${id}`)
  }

  function handleLoadTemplate() {
    const next = createProjectTemplate(templateChoice)
    stack.set(next)
    setSelectedId(next.tasks[0]?.id ?? null)
    setPhaseFilter('All')
    setCriticalOnly(false)
    setErrorMsg(null)
    setNotice(`Loaded ${next.title}`)
  }

  function handleExportCsv() {
    const header = ['ID', 'Task', 'Phase', 'Assignee', 'Start', 'End', 'Duration (d)', 'Progress %', 'Slack (d)', 'Critical', 'Dependencies']
    const rows = schedule.scheduled.map((s) => [
      s.task.id,
      s.task.name,
      s.task.phase,
      s.task.assignee,
      s.startDate,
      s.endDate,
      String(s.task.duration),
      String(s.task.progress),
      String(s.slack),
      s.isCritical ? 'Yes' : 'No',
      s.task.dependencies.join('; '),
    ])
    saveText(toCsv([header, ...rows]), { filename: 'project-gantt.csv', mimeType: 'text/csv;charset=utf-8' })
    setNotice('Exported project-gantt.csv')
  }

  function handleExportIcs() {
    const events = schedule.scheduled.map((s) => ({
      id: `lacuna-gantt-${s.task.id}@lacunaos.com`,
      summary: `${s.task.id}: ${s.task.name}`,
      description: `Phase: ${s.task.phase} | Assignee: ${s.task.assignee} | Progress: ${s.task.progress}%`,
      startDate: s.startDate,
      endDate: s.endDate,
      allDay: true,
    }))
    saveText(toIcs(events), { filename: 'project-gantt.ics', mimeType: 'text/calendar;charset=utf-8' })
    setNotice('Exported project-gantt.ics')
  }

  function handleExportJson() {
    saveJSON(project, { filename: 'project-gantt.json' })
    setNotice('Exported project-gantt.json')
  }

  async function handleImportJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const res = await openFile(file, 'json')
    if (!res.ok) {
      setErrorMsg(`Could not import JSON: ${res.error}`)
      return
    }
    const data = res.data as Partial<GanttProject>
    if (!data || typeof data.title !== 'string' || !Array.isArray(data.tasks)) {
      setErrorMsg('File is not a valid Project Gantt JSON export.')
      return
    }
    stack.set({
      title: data.title,
      startDate: typeof data.startDate === 'string' ? data.startDate : '2026-12-01',
      tasks: data.tasks,
    })
    setSelectedId(data.tasks[0]?.id ?? null)
    setErrorMsg(null)
    setNotice(`Imported ${data.tasks.length} tasks`)
  }

  const statusText = [
    notice,
    `${project.tasks.length} tasks`,
    `${schedule.projectDuration}d duration`,
    `${schedule.criticalCount} critical`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <AppShell
      name="Project Gantt"
      icon="projects"
      hue="cobalt"
      category="Productivity"
      meta={`${project.title} · ${schedule.projectDuration} days`}
      status={statusText}
      actions={
        <Actions>
          <Button kind="secondary" onClick={() => stack.undo()} disabled={!stack.canUndo}>Undo</Button>
          <Button kind="secondary" onClick={() => stack.redo()} disabled={!stack.canRedo}>Redo</Button>
          <Button kind="secondary" onClick={handleExportIcs}>Export ICS</Button>
          <Button kind="secondary" onClick={handleExportCsv}>Export CSV</Button>
          <Button kind="secondary" onClick={handleExportJson}>Export JSON</Button>
        </Actions>
      }
      side={
        <>
          <Rail title="Task Inspector" note={selectedScheduled ? selectedScheduled.task.id : 'None'}>
            {selectedScheduled ? (
              <div className="gp-rail-stack">
                <TextInput
                  label="Task name"
                  value={selectedScheduled.task.name}
                  onChange={(v) => updateTask(selectedScheduled.task.id, { name: v })}
                />
                <TextInput
                  label="Phase"
                  value={selectedScheduled.task.phase}
                  onChange={(v) => updateTask(selectedScheduled.task.id, { phase: v })}
                />
                <TextInput
                  label="Assignee"
                  value={selectedScheduled.task.assignee}
                  onChange={(v) => updateTask(selectedScheduled.task.id, { assignee: v })}
                />
                <TextInput
                  label="Duration (days, 0 = milestone)"
                  inputMode="numeric"
                  value={String(selectedScheduled.task.duration)}
                  onChange={(v) => {
                    const n = Number(v)
                    if (!Number.isNaN(n) && n >= 0 && n <= 365) {
                      updateTask(selectedScheduled.task.id, { duration: Math.round(n) })
                    }
                  }}
                />
                <TextInput
                  label="Progress (%)"
                  inputMode="numeric"
                  value={String(selectedScheduled.task.progress)}
                  onChange={(v) => {
                    const n = Number(v)
                    if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                      updateTask(selectedScheduled.task.id, { progress: Math.round(n) })
                    }
                  }}
                />
                <div>
                  <div className="lc-field-label">Predecessors (Finish-to-Start)</div>
                  <div className="gp-dep-chips">
                    {project.tasks
                      .filter((t) => t.id !== selectedScheduled.task.id)
                      .map((other) => {
                        const active = selectedScheduled.task.dependencies.includes(other.id)
                        return (
                          <button
                            key={other.id}
                            type="button"
                            className="gp-dep-toggle"
                            aria-pressed={active}
                            onClick={() => toggleDependency(selectedScheduled.task.id, other.id)}
                          >
                            {other.id}
                          </button>
                        )
                      })}
                  </div>
                </div>
                <Actions>
                  <Tag accent={selectedScheduled.isCritical}>
                    {selectedScheduled.isCritical ? 'Critical path' : `Slack ${selectedScheduled.slack}d`}
                  </Tag>
                  <Button kind="danger" onClick={() => handleDeleteTask(selectedScheduled.task.id)}>
                    Delete task
                  </Button>
                </Actions>
              </div>
            ) : (
              <EmptyState
                mono="No selection"
                title="Select a task"
                detail="Click any task bar or row to edit duration, progress, and dependencies."
                actionLabel="Add a task below"
                onAction={() => setNewName('New milestone')}
              />
            )}
          </Rail>

          <Rail title="Resource Workload">
            <List label="Assignee workload">
              {schedule.resources.map((r) => (
                <Row
                  key={r.assignee}
                  title={r.assignee}
                  meta={`${r.taskCount} tasks · ${r.avgProgress}% avg`}
                  value={`${r.totalDays}d`}
                />
              ))}
            </List>
          </Rail>

          <Rail title="Project Template">
            <div className="gp-rail-stack">
              <Select
                label="Template"
                value={templateChoice}
                onChange={(v) => setTemplateChoice(v as ProjectTemplateId)}
                options={PROJECT_TEMPLATES.map((t) => ({ value: t.id, label: t.label }))}
              />
              <Button kind="secondary" onClick={handleLoadTemplate}>Load template</Button>
              <Button kind="ghost" onClick={() => jsonInputRef.current?.click()}>Import JSON</Button>
              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                aria-label="Import project JSON"
                className="gp-file-hidden"
                onChange={handleImportJson}
              />
            </div>
          </Rail>
        </>
      }
    >
      {errorMsg && <ErrorState title="Schedule error" detail={errorMsg} />}
      {schedule.hasCycle && (
        <ErrorState
          title="Dependency cycle detected"
          detail="Remove a circular predecessor link so Critical Path slack can be computed."
        />
      )}

      <Card mono="Overview" title={project.title}>
        <KpiRow>
          <Kpi value={`${schedule.projectDuration}d`} label="Total Duration" accent />
          <Kpi value={`${schedule.weightedProgress}%`} label="Progress" />
          <Kpi value={String(schedule.criticalCount)} label="Critical Tasks" />
          <Kpi value={formatShortDate(schedule.projectEndDate)} label="Target Finish" />
        </KpiRow>
      </Card>

      <Card mono="Timeline" title="Gantt Chart">
        <div className="gp-toolbar">
          <div className="gp-toolbar-group">
            <Pills
              items={ZOOM_ITEMS}
              active={zoom}
              onSelect={(v) => setZoom(v as ZoomLevel)}
            />
            <Checkbox
              label="Critical path only"
              checked={criticalOnly}
              onChange={setCriticalOnly}
            />
          </div>
          <div className="gp-toolbar-group">
            <Select
              label="Phase"
              value={phaseFilter}
              onChange={setPhaseFilter}
              options={phases}
            />
          </div>
        </div>

        {visibleTasks.length > 0 ? (
          <GanttChart
            startDate={project.startDate}
            tasks={visibleTasks}
            projectDuration={schedule.projectDuration}
            zoom={zoom}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          <EmptyState
            mono="Filtered"
            title="No matching tasks"
            detail="Adjust the phase or critical-path filter to show tasks."
            actionLabel="Reset filters"
            onAction={() => {
              setPhaseFilter('All')
              setCriticalOnly(false)
            }}
          />
        )}
      </Card>

      <Card mono="Work Breakdown" title="Schedule Table">
        <Table
          label="Project schedule"
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Task' },
            { key: 'phase', label: 'Phase' },
            { key: 'assignee', label: 'Assignee' },
            { key: 'window', label: 'Dates' },
            { key: 'duration', label: 'Days', num: true },
            { key: 'slack', label: 'Slack', num: true },
            { key: 'progress', label: 'Done', num: true },
          ]}
          rows={visibleTasks.map((s) => ({
            hot: s.isCritical,
            cells: {
              id: s.task.id,
              name: (
                <button
                  type="button"
                  className="lc-btn lc-btn-ghost"
                  onClick={() => setSelectedId(s.task.id)}
                >
                  {s.task.name}
                </button>
              ),
              phase: s.task.phase,
              assignee: s.task.assignee,
              window: `${formatShortDate(s.startDate)} – ${formatShortDate(s.endDate)}`,
              duration: s.task.duration === 0 ? 'Milestone' : `${s.task.duration}d`,
              slack: s.isCritical ? '0d (CPM)' : `${s.slack}d`,
              progress: `${s.task.progress}%`,
            },
          }))}
          empty="No tasks scheduled."
        />
      </Card>

      <Card mono="Add Task" title="New Task">
        <FormGrid>
          <TextInput
            label="New task name"
            placeholder="e.g. Final QA sign-off"
            value={newName}
            onChange={setNewName}
            error={formError}
          />
          <TextInput
            label="New task phase"
            value={newPhase}
            onChange={setNewPhase}
          />
          <TextInput
            label="New task assignee"
            value={newAssignee}
            onChange={setNewAssignee}
          />
          <TextInput
            label="New task duration (days)"
            inputMode="numeric"
            value={newDuration}
            onChange={setNewDuration}
          />
          <Select
            label="Depends on"
            value={newDep}
            onChange={setNewDep}
            options={[
              { value: '', label: 'None' },
              ...project.tasks.map((t) => ({ value: t.id, label: `${t.id}: ${t.name}` })),
            ]}
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={handleAddTask}>Add task</PrimaryButton>
        </Actions>
      </Card>
    </AppShell>
  )
}
