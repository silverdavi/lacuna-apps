import { useEffect, useRef, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  SectionLabel,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { formatCost, formatMileage, host, type MaintenanceRecord, type UpcomingTask } from './host'

const RECORD_TYPES = ['Service', 'Repair', 'Inspection', 'Tire', 'Other']

type RecordForm = {
  title: string
  date: string
  mileage: string
  cost: string
  type: string
}

const EMPTY_RECORD: RecordForm = { title: '', date: '', mileage: '', cost: '', type: 'Service' }

type TaskForm = {
  task: string
  dueMileage: string
  interval: string
}

const EMPTY_TASK: TaskForm = { task: '', dueMileage: '', interval: '' }

export function App() {
  const [tab, setTab] = useState('History')
  const [records, setRecords] = useState<MaintenanceRecord[]>(() => host.listRecords())
  const [tasks, setTasks] = useState<UpcomingTask[]>(() => host.listTasks())
  const [search, setSearch] = useState('')
  const [recordOpen, setRecordOpen] = useState(false)
  const [record, setRecord] = useState<RecordForm>(EMPTY_RECORD)
  const [recordError, setRecordError] = useState('')
  const [taskOpen, setTaskOpen] = useState(false)
  const [task, setTask] = useState<TaskForm>(EMPTY_TASK)
  const [taskError, setTaskError] = useState('')
  const [currentMileage, setCurrentMileage] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!toast) return
    toastTimer.current = setTimeout(() => setToast(''), 2500)
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [toast])

  const filtered = records.filter((record) =>
    record.title.toLowerCase().includes(search.trim().toLowerCase()),
  )

  const totalCost = records.reduce((sum, record) => sum + record.cost, 0)

  const latestMileage = records.reduce((max, record) => Math.max(max, record.mileage), 0)

  const current = currentMileage === '' ? null : Number(currentMileage)

  function saveRecord() {
    const title = record.title.trim()
    if (!title) {
      setRecordError('Give the record a title')
      return
    }
    const mileage = Number(record.mileage)
    if (!Number.isFinite(mileage) || mileage < 0) {
      setRecordError('Mileage must be a number')
      return
    }
    const cost = record.cost === '' ? 0 : Number(record.cost)
    if (!Number.isFinite(cost) || cost < 0) {
      setRecordError('Cost must be a number')
      return
    }
    host.addRecord({ title, date: record.date, mileage, cost, type: record.type })
    setRecords(host.listRecords())
    setRecord(EMPTY_RECORD)
    setRecordError('')
    setRecordOpen(false)
    setToast('Record added')
  }

  function removeRecord(id: string, title: string) {
    host.deleteRecord(id)
    setRecords(host.listRecords())
    setToast(`Deleted ${title}`)
  }

  function saveTask() {
    const taskName = task.task.trim()
    if (!taskName) {
      setTaskError('Give the task a name')
      return
    }
    const dueMileage = Number(task.dueMileage)
    if (!Number.isFinite(dueMileage) || dueMileage < 0) {
      setTaskError('Due mileage must be a number')
      return
    }
    const interval = Number(task.interval)
    if (!Number.isFinite(interval) || interval <= 0) {
      setTaskError('Interval must be a positive number')
      return
    }
    host.addTask({ task: taskName, dueMileage, interval })
    setTasks(host.listTasks())
    setTask(EMPTY_TASK)
    setTaskError('')
    setTaskOpen(false)
    setToast('Upcoming task added')
  }

  function removeTask(id: string, name: string) {
    host.deleteTask(id)
    setTasks(host.listTasks())
    setToast(`Deleted ${name}`)
  }

  function exportCsv() {
    const rows: string[][] = [
      ['id', 'title', 'date', 'mileage', 'cost', 'type', 'createdAt'],
      ...records.map((record) => [
        record.id,
        record.title,
        record.date,
        String(record.mileage),
        String(record.cost),
        record.type,
        record.createdAt,
      ]),
    ]
    void toCsv(rows)
    setToast(`Exported ${records.length} records to CSV`)
  }

  return (
    <AppShell
      name="Car Maintenance Log"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta={`${records.length} ${records.length === 1 ? 'record' : 'records'}`}
      status={toast ? toast : undefined}
    >
      <div className="cm-tabs" role="tablist" aria-label="Views">
        {(['History', 'Upcoming'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'cm-tab active' : 'cm-tab'}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'History' ? (
        <Stack>
          <Card
            mono="Search"
            title="Find a record"
            actions={
              <Button kind="secondary" onClick={exportCsv}>
                Export CSV
              </Button>
            }
          >
            <TextInput
              label="Search"
              type="search"
              value={search}
              onChange={setSearch}
              placeholder="Filter by title"
            />
          </Card>

          <Card
            mono="Log"
            title="Service history"
            actions={
              <Button kind="primary" onClick={() => setRecordOpen((open) => !open)}>
                Add record
              </Button>
            }
          >
            <Stack>
              {recordOpen ? (
                <Card mono="New" title="Add record">
                  <Stack>
                    <FormGrid>
                      <TextInput
                        label="Title"
                        value={record.title}
                        onChange={(value) => setRecord({ ...record, title: value })}
                        placeholder="Oil Change"
                      />
                      <TextInput
                        label="Date"
                        type="date"
                        value={record.date}
                        onChange={(value) => setRecord({ ...record, date: value })}
                      />
                      <TextInput
                        label="Mileage"
                        type="number"
                        inputMode="numeric"
                        value={record.mileage}
                        onChange={(value) => setRecord({ ...record, mileage: value })}
                        placeholder="5000"
                      />
                      <TextInput
                        label="Cost"
                        type="number"
                        inputMode="decimal"
                        value={record.cost}
                        onChange={(value) => setRecord({ ...record, cost: value })}
                        placeholder="85.50"
                      />
                      <Select
                        label="Type"
                        value={record.type}
                        onChange={(value) => setRecord({ ...record, type: value })}
                        options={RECORD_TYPES}
                      />
                    </FormGrid>
                    {recordError ? <SectionLabel>{recordError}</SectionLabel> : null}
                    <Actions>
                      <Button kind="primary" onClick={saveRecord}>
                        Save
                      </Button>
                      <Button
                        kind="ghost"
                        onClick={() => {
                          setRecordOpen(false)
                          setRecordError('')
                        }}
                      >
                        Cancel
                      </Button>
                    </Actions>
                  </Stack>
                </Card>
              ) : null}

              {filtered.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title={
                    records.length === 0
                      ? 'No records yet'
                      : `No records match “${search}”`
                  }
                  detail="Log the first service to start the history."
                  actionLabel="Add record"
                />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {filtered.map((record) => (
                    <li
                      key={record.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'calc(8px * var(--sf))',
                        padding: 'calc(8px * var(--sf)) 0',
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                        <strong>{record.title}</strong>
                        <span>{record.date}</span>
                        <span>{formatMileage(record.mileage)}</span>
                        <span>{formatCost(record.cost)}</span>
                        <span>{record.type}</span>
                      </span>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${record.title}`}
                          onClick={() => removeRecord(record.id, record.title)}
                        >
                          Delete
                        </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        </Stack>
      ) : (
        <Stack>
          <Card mono="Odometer" title="Current mileage">
            <TextInput
              label="Current Mileage"
              type="number"
              inputMode="numeric"
              value={currentMileage}
              onChange={setCurrentMileage}
              placeholder="14000"
              hint="Used to compute what is due"
            />
          </Card>

          <Card
            mono="Schedule"
            title={
              <h2 className="lc-title lc-title-md" style={{ margin: 0 }}>
                Upcoming Maintenance
              </h2>
            }
            actions={
              <Button kind="primary" onClick={() => setTaskOpen((open) => !open)}>
                Add upcoming
              </Button>
            }
          >
            <Stack>
              {taskOpen ? (
                <Card mono="New" title="Add upcoming task">
                  <Stack>
                    <FormGrid>
                      <TextInput
                        label="Task"
                        value={task.task}
                        onChange={(value) => setTask({ ...task, task: value })}
                        placeholder="Tire Rotation"
                      />
                      <TextInput
                        label="Due Mileage"
                        type="number"
                        inputMode="numeric"
                        value={task.dueMileage}
                        onChange={(value) => setTask({ ...task, dueMileage: value })}
                        placeholder="15000"
                      />
                      <TextInput
                        label="Interval"
                        type="number"
                        inputMode="numeric"
                        value={task.interval}
                        onChange={(value) => setTask({ ...task, interval: value })}
                        placeholder="5000"
                      />
                    </FormGrid>
                    {taskError ? <SectionLabel>{taskError}</SectionLabel> : null}
                    <Actions>
                      <Button kind="primary" onClick={saveTask}>
                        Save
                      </Button>
                      <Button
                        kind="ghost"
                        onClick={() => {
                          setTaskOpen(false)
                          setTaskError('')
                        }}
                      >
                        Cancel
                      </Button>
                    </Actions>
                  </Stack>
                </Card>
              ) : null}

              {tasks.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="Nothing scheduled"
                  detail="Add a task with its due mileage to start the schedule."
                  actionLabel="Add upcoming"
                />
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {tasks.map((task) => (
                    <li
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'calc(8px * var(--sf))',
                        padding: 'calc(8px * var(--sf)) 0',
                        borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                        <strong>{task.task}</strong>
                        <span>Due at {formatMileage(task.dueMileage)}</span>
                        <span>Every {formatMileage(task.interval)}</span>
                        {current != null ? (
                          <span>
                            {current >= task.dueMileage
                              ? `Overdue by ${formatMileage(current - task.dueMileage)}`
                              : `Due in ${formatMileage(task.dueMileage - current)}`}
                          </span>
                        ) : null}
                      </span>
                        <Button
                          kind="ghost"
                          ariaLabel={`Delete ${task.task}`}
                          onClick={() => removeTask(task.id, task.task)}
                        >
                          Delete
                        </Button>
                    </li>
                  ))}
                </ul>
              )}

              <KpiRow>
                <Kpi value={tasks.length} label="Scheduled" />
                <Kpi value={latestMileage ? formatMileage(latestMileage) : '—'} label="Latest logged" />
                <Kpi value={formatCost(totalCost)} label="Total spent" />
              </KpiRow>
            </Stack>
          </Card>
        </Stack>
      )}
    </AppShell>
  )
}
