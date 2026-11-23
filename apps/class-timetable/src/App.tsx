// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Select,
  Table,
  TextInput,
} from '@lacuna/ui'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { addClass, DAYS, listClasses, removeClass, type Class, type Day } from './host'
import './app.css'

const DAY_ORDER: Record<Day, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
}

function toIcsDate(day: Day, time: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const today = now.getDate()
  const dow = now.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const target = today + mondayOffset + DAY_ORDER[day]
  const date = new Date(Date.UTC(year, now.getMonth(), target))
  const dayPart = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${dayPart}T${time}:00`
}

export function App() {
  const [classes, setClasses] = useState<Class[]>(() => {
    try {
      return listClasses()
    } catch {
      return []
    }
  })
  const [tab, setTab] = useState('Week')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [day, setDay] = useState<Day>('Monday')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [sort, setSort] = useState<{ key: 'name' | 'day' | 'start'; dir: 1 | -1 } | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  function refresh(next: Class[]) {
    setClasses(next)
  }

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Type a class name first')
    if (!/^\d{2}:\d{2}$/.test(start)) return setError('Start time must be HH:MM')
    if (!/^\d{2}:\d{2}$/.test(end)) return setError('End time must be HH:MM')
    if (end <= start) return setError('End time must be after start time')
    setClasses((prev) => {
      const added = addClass({ name: trimmed, day, start, end })
      return [...prev, added]
    })
    setName('')
    setStart('')
    setEnd('')
    setError(null)
  }

  function deleteClass(id: string) {
    setClasses((prev) => prev.filter((c) => c.id !== id))
    removeClass(id)
    setSelectedId(null)
  }

  const sortedClasses = useMemo(() => {
    if (sort === null) return classes
    const { key, dir } = sort
    return [...classes].sort((a, b) => {
      let cmp = 0
      if (key === 'name') cmp = a.name.localeCompare(b.name)
      else if (key === 'day') cmp = DAY_ORDER[a.day] - DAY_ORDER[b.day] || a.start.localeCompare(b.start)
      else cmp = a.start.localeCompare(b.start)
      return cmp * dir
    })
  }, [classes, sort])

  function toggleSort(key: 'name' | 'day' | 'start') {
    setSort((cur) => {
      if (cur === null || cur.key !== key) return { key, dir: 1 }
      if (cur.dir === 1) return { key, dir: -1 }
      return null
    })
  }

  function exportIcs() {
    const events: IcsEvent[] = classes.map((c) => ({
      id: c.id,
      summary: c.name,
      startDate: toIcsDate(c.day, c.start),
      endDate: toIcsDate(c.day, c.end),
      allDay: false,
    }))
    void copy(toIcs(events))
  }

  const selected = selectedId != null ? classes.find((c) => c.id === selectedId) ?? null : null

  return (
    <AppShell
      name="Class Timetable"
      icon="calendar"
      hue="gold"
      category="Productivity"
      meta={`${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`}
    >
      <Card mono="New" title="Add a class">
        <FormGrid>
          <TextInput label="Class name" value={name} onChange={setName} error={error} />
          <Select
            label="Day"
            value={day}
            onChange={(value) => setDay(value as Day)}
            options={DAYS.map((d) => ({ value: d, label: d.slice(0, 3) }))}
          />
          <TextInput label="Start time" value={start} onChange={setStart} placeholder="09:00" />
          <TextInput label="End time" value={end} onChange={setEnd} placeholder="10:00" />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={submit}>Add class</PrimaryButton>
        </Actions>
      </Card>

      <Card
        mono={`${classes.length} saved`}
        title="Schedule"
        actions={
          <Button kind="secondary" onClick={exportIcs}>
            {copied ? 'Copied ICS' : 'Export ICS'}
          </Button>
        }
      >
        <div role="tablist" className="ct-tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'Week'}
            className={`ct-tab${tab === 'Week' ? ' active' : ''}`}
            onClick={() => setTab('Week')}
          >
            Week
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'Table'}
            className={`ct-tab${tab === 'Table' ? ' active' : ''}`}
            onClick={() => setTab('Table')}
          >
            Table
          </button>
        </div>
        {tab === 'Week' ? (
          <div className="ct-grid">
            {DAYS.map((d) => {
              const dayClasses = classes.filter((c) => c.day === d)
              return (
                <div key={d} className="ct-day">
                  <h2>{d}</h2>
                  <div className="ct-day-body">
                    {dayClasses.length === 0 ? (
                      <div className="ct-day-empty">No classes</div>
                    ) : (
                      dayClasses.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="ct-block"
                          onClick={() => setSelectedId(c.id)}
                        >
                          {c.name}
                          <span className="ct-block-time"> {c.start}–{c.end}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ct-table-wrap">
            <Table
              label="Classes"
              columns={[
                {
                  key: 'name',
                  label: (
                    <span
                      className="ct-th-sort"
                      onClick={() => toggleSort('name')}
                      role="button"
                    >
                      Class name
                    </span>
                  ),
                },
                {
                  key: 'day',
                  label: (
                    <span
                      className="ct-th-sort"
                      onClick={() => toggleSort('day')}
                      role="button"
                    >
                      Day
                    </span>
                  ),
                },
                {
                  key: 'start',
                  label: (
                    <span
                      className="ct-th-sort"
                      onClick={() => toggleSort('start')}
                      role="button"
                    >
                      Start
                    </span>
                  ),
                },
                { key: 'end', label: 'End' },
              ]}
              rows={sortedClasses.map((c) => ({
                cells: {
                  name: c.name,
                  day: c.day,
                  start: c.start,
                  end: c.end,
                },
              }))}
              empty="No classes yet. Add one above."
            />
          </div>
        )}
      </Card>

      {selected != null && (
        <Card mono="Details" title={selected.name} accent>
          <div className="ct-detail">
            {selected.day} · {selected.start}–{selected.end}
          </div>
          <Actions>
            <Button kind="secondary" onClick={() => setSelectedId(null)}>
              Close
            </Button>
            <Button kind="danger" onClick={() => deleteClass(selected.id)}>
              Delete class
            </Button>
          </Actions>
        </Card>
      )}

      {classes.length === 0 && (
        <Card>
          <EmptyState
            mono="Empty"
            title="No classes yet"
            detail="Add your first class with the form above."
            actionLabel="Add a class"
          />
        </Card>
      )}
    </AppShell>
  )
}
