// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,

  TextInput,
} from '@lacuna/ui'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { addClass, DAYS, listClasses, removeClass, type Class, type Day } from './host'
import './app.css'

const DAY_ABBR: Record<Day, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
}

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
      hue="rust"
      category="Productivity"
      meta={`${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`}
    >
      <Card mono="New" title="Add a class">
        <FormGrid>
          <TextInput label="Class name" value={name} onChange={setName} error={error} />
          <div className="lc-field">
            <label className="lc-field-label" htmlFor="ct-day">Day</label>
            <select
              id="ct-day"
              className="lc-input"
              value={day}
              onChange={(event) => setDay(event.target.value as Day)}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_ABBR[d]}
                </option>
              ))}
            </select>
          </div>
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
          {['Week', 'Table'].map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={tab === item}
              className={`ct-tab${tab === item ? ' active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === 'Week' ? (
          <div className="ct-grid">
            {DAYS.map((d) => {
              const dayClasses = classes.filter((c) => c.day === d).sort((a, b) => a.start.localeCompare(b.start))
              return (
                <section key={d} className="ct-day" role="region" aria-label={d}>
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
                          {`${c.name} ${c.start}–${c.end}`}
                        </button>
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="ct-table-wrap">
            {sortedClasses.length === 0 ? (
              <p className="lc-faint ct-empty">No classes yet. Add one above.</p>
            ) : (
              <div className="ct-table" aria-label="Classes">
                <div className="ct-table-head" role="row">
                  <span role="columnheader">
                    <span className="ct-th-sort" role="button" onClick={() => toggleSort('name')}>
                      Class name
                    </span>
                  </span>
                  <span role="columnheader">
                    <span className="ct-th-sort" role="button" onClick={() => toggleSort('day')}>
                      Day
                    </span>
                  </span>
                  <span role="columnheader">
                    <span className="ct-th-sort" role="button" onClick={() => toggleSort('start')}>
                      Start
                    </span>
                  </span>
                  <span role="columnheader">End</span>
                </div>
                <table className="ct-table-body">
                  <tbody>
                    {sortedClasses.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.day}</td>
                        <td>{c.start}</td>
                        <td>{c.end}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {selected != null && (
        <div className="ct-overlay">
          <div className="ct-dialog" role="dialog" aria-modal="true" aria-label="Class details">
            <KpiRow>
              <Kpi value={selected.name} label="Class" accent />
            </KpiRow>
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
          </div>
        </div>
      )}

    </AppShell>
  )
}
