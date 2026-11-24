import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AppShell,
  Body,
  Button,
  Card,
  Divider,
  EmptyState,
  Kpi,
  KpiRow,
  MonoLabel,
  PrimaryButton,
  Tag,
} from '@lacuna/ui'
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'
import { computeStreaks } from '@lacuna/streak-calc'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import type { BackupRecord } from '@lacuna/json-backup'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { store, readDays, writeDays, type Day, type DayTask } from './host'

function calcPx(n: number) {
  return `calc(${n}px * var(--tf))`
}

function calcSf(n: number) {
  return `calc(${n}px * var(--sf))`
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function todayISO() {
  return toISODate(new Date())
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function App() {
  const [days, setDays] = useState<Record<string, Day>>(() => readDays())
  const [selected, setSelected] = useState(() => {
    const p = fromISODate(todayISO())
    return p ? toISODate(new Date(p.getFullYear(), p.getMonth(), 15)) : todayISO()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    const t = fromISODate(todayISO()) ?? new Date()
    return { year: t.getFullYear(), month: t.getMonth() + 1 }
  })
  const [draft, setDraft] = useState('')

  const { year, month } = viewMonth
  const dim = daysInMonth(year, month)
  const first = new Date(year, month - 1, 1)
  const firstDow = first.getDay()
  const offsetDays = firstDow === 0 ? 6 : firstDow - 1
  const cells: Array<{ date: number | null; iso: string }> = []
  for (let i = offsetDays; i > 0; i--) {
    const d = addDays(new Date(year, month - 1, 1), -i)
    cells.push({ date: null, iso: toISODate(d) })
  }
  for (let d = 1; d <= dim; d++) cells.push({ date: d, iso: toISODate(new Date(year, month - 1, d)) })
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = addDays(fromISODate(last.iso) ?? first, 1)
    cells.push({ date: null, iso: toISODate(d) })
  }

  const sel = fromISODate(selected) ?? new Date()
  const currentDayISO = toISODate(sel)
  const currentTasks: DayTask[] = days[currentDayISO]?.tasks ?? []
  const done = currentTasks.filter((t) => t.done).length

  const checkInDays = useMemo(() => {
    const seen = new Set<string>()
    for (const [iso, day] of Object.entries(days)) {
      if (day.tasks.some((t) => t.done)) seen.add(iso)
    }
    return [...seen]
  }, [days])

  const streak = useMemo(() => computeStreaks(checkInDays, { today: todayISO() }), [checkInDays])

  const totalAll = Object.values(days).reduce((acc, d) => acc + d.tasks.length, 0)
  const doneAll = Object.values(days).reduce((acc, d) => acc + d.tasks.filter((t) => t.done).length, 0)

  const todayIso = todayISO()
  const todayDay = days[todayIso]
  const todayTasks: DayTask[] = todayDay?.tasks ?? []
  const isToday = currentDayISO === todayIso

  const commit = (next: Record<string, Day>) => {
    setDays(next)
    writeDays(store, next)
  }

  const addTask = () => {
    const text = draft.replace(/[\n\r]+/g, ' ').trim()
    if (!text) return
    const nextDay: Day = { date: currentDayISO, tasks: [...currentTasks, { id: newId(), label: text, done: false }] }
    commit({ ...days, [currentDayISO]: nextDay })
    setDraft('')
  }

  const moveTask = (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= currentTasks.length) return
    const next = [...currentTasks]
    const [item] = next.splice(index, 1)
    next.splice(j, 0, item)
    commit({ ...days, [currentDayISO]: { date: currentDayISO, tasks: next } })
  }

  const toggleTask = (id: string) => {
    commit({ ...days, [currentDayISO]: { date: currentDayISO, tasks: currentTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) } })
  }

  const deleteTask = (id: string) => {
    const remaining = currentTasks.filter((t) => t.id !== id)
    const nextTasks =
      remaining.length === 1 && !remaining[0].done
        ? remaining.map((t, i) => (i === 0 ? { ...t, done: true } : t))
        : remaining
    commit({ ...days, [currentDayISO]: { date: currentDayISO, tasks: nextTasks } })
  }

  const goToDay = (iso: string) => {
    setSelected(iso)
    const p = fromISODate(iso)
    if (p) setViewMonth({ year: p.getFullYear(), month: p.getMonth() + 1 })
  }

  const importJSON = () => {
    const text = window.prompt('Paste JSON backup:')
    if (!text) return
    try {
      const result = importBackup<Day>(text, { currentVersion: 1 })
      const merged: Record<string, Day> = { ...days }
      for (const record of result.records as BackupRecord<Day>[]) {
        if (record.data && typeof record.data.date === 'string' && Array.isArray(record.data.tasks)) {
          merged[record.data.date] = record.data
        }
      }
      commit(merged)
    } catch (error) {
      window.alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'JSON backup',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => {
        const records: BackupRecord<Day>[] = Object.values(days).map((d) => ({
          id: d.date,
          data: d,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }))
        return exportBackup<Day>({ appId: 'bullet-journal', version: 1, records })
      },
    },
    {
      id: 'txt',
      label: 'Plain text',
      mimeType: 'text/plain',
      extension: 'txt',
      getData: () =>
        Object.entries(days)
          .flatMap(([iso, d]) => d.tasks.map((t) => `${t.done ? '[x]' : '[ ]'} ${iso}  ${t.label}`))
          .sort()
          .join('\n'),
    },
  ]

  const mLabel = monthLabel(year, month)

  const styleTaskRow: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: calcSf(8),
    padding: `${calcSf(6)} 0`,
    flexWrap: 'wrap',
  }

  const styleTaskText: CSSProperties = {
    flex: '1 1 12ch',
    minWidth: 0,
    fontSize: calcPx(13),
    lineHeight: 1.45,
  }

  return (
    <AppShell
      name="Bullet Journal"
      icon="calendar"
      hue="teal"
      category="Planner"
      meta={
        <span>
          {totalAll} items · {doneAll} done
        </span>
      }
      status={`${doneAll} of ${totalAll} complete`}
      actions={
        <div style={{ display: 'flex', gap: calcSf(8), alignItems: 'center', flexWrap: 'wrap' }}>
          <Button kind="secondary" onClick={importJSON}>
            Import
          </Button>
          <ExportMenu options={exportOptions} fileName="bullet-journal" />
        </div>
      }
      side={
        <div style={{ display: 'flex', flexDirection: 'column', gap: calcSf(12) }}>
          <Card title="Streak">
            <KpiRow>
              <Kpi value={streak.current} label="Current streak" />
              <Kpi value={streak.longest} label="Longest streak" accent />
            </KpiRow>
            <Divider />
            <div style={{ fontSize: calcPx(12), color: 'var(--ink-60)', marginTop: calcSf(6) }}>
              Days with a completed task.
            </div>
          </Card>
          <Card title="All days">
            <KpiRow>
              <Kpi value={doneAll} label="Done" />
              <Kpi value={totalAll} label="All items" />
            </KpiRow>
          </Card>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: calcSf(12) }}>
        <Card title={mLabel} mono="Calendar" flush>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: calcSf(4),
              padding: calcSf(10),
            }}
            role="group"
            aria-label={mLabel}
          >
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div
                key={i}
                style={{ fontSize: calcPx(10), color: 'var(--ink-60)', textAlign: 'center', fontFamily: 'var(--mono)' }}
              >
                {d}
              </div>
            ))}
            {cells.map((c, i) => {
              const dayData = days[c.iso]
              const count = dayData?.tasks.length ?? 0
              const dayDone = dayData ? dayData.tasks.filter((t) => t.done).length : 0
              const allDone = count > 0 && dayDone === count
              const isSelected = c.iso === selected
              const isTodayDot = c.iso === todayIso
              const inMonth = c.date != null
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={c.date != null ? String(c.date) : `Day ${i + 1}`}
                  onClick={() => inMonth && goToDay(c.iso)}
                  style={{
                    border: isSelected ? 'calc(2px * var(--sf)) solid var(--accent)' : 'calc(1px * var(--sf)) solid var(--line)',
                    borderRadius: calcPx(6),
                    background: isSelected ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'transparent',
                    color: inMonth ? 'var(--ink)' : 'var(--ink-60)',
                    padding: `${calcSf(6)} 0`,
                    cursor: inMonth ? 'pointer' : 'default',
                    position: 'relative',
                    minHeight: calcSf(34),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: calcSf(2),
                    fontSize: calcPx(12),
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <span aria-hidden>{c.date ?? ''}</span>
                  <span
                    aria-hidden
                    style={{
                      width: calcSf(5),
                      height: calcSf(5),
                      borderRadius: '50%',
                      background: allDone ? 'var(--accent)' : isTodayDot ? 'var(--ink-60)' : 'transparent',
                      display: 'block',
                    }}
                  />
                  {count > 0 && allDone && (
                    <span aria-hidden style={{ fontSize: calcPx(9), color: 'var(--ink-60)' }}>
                      ✓
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        <Card title={`Tasks for ${sel.getDate()}`} actions={currentTasks.length > 0 ? <Tag accent>{done}/{currentTasks.length}</Tag> : undefined}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: calcSf(8) }}>
            <div style={{ display: 'flex', gap: calcSf(8), flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ flex: '1 1 20ch', minWidth: 0, display: 'block' }}>
                <span className="lc-field-label">New task</span>
                <input
                  className="lc-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTask()
                    }
                  }}
                  placeholder="Add a task for this day"
                />
                <span className="lk-field-hint" style={{ color: 'var(--ink-60)' }}>Press Enter to add</span>
              </label>
              <PrimaryButton onClick={addTask}>Add</PrimaryButton>
            </div>

            {currentTasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                detail="Add your first task for this day above."
                actionLabel="Type in the New task field"
              />
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }} aria-label="Task list">
                {currentTasks.map((t, i) => (
                  <li key={t.id} style={styleTaskRow}>
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => toggleTask(t.id)}
                      aria-label={t.label}
                      style={{
                        width: calcSf(16),
                        height: calcSf(16),
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        ...styleTaskText,
                        color: t.done ? 'var(--ink-60)' : 'var(--ink)',
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}
                    >
                      {t.label}
                    </span>
                    <div style={{ display: 'flex', gap: calcSf(4), flexWrap: 'wrap' }}>
                      {i > 0 && (
                        <Button
                          kind="ghost"
                          onClick={() => moveTask(i, -1)}
                          title="Move up"
                          style={{ fontSize: calcPx(11), padding: `0 ${calcSf(6)}` }}
                        >
                          Move up
                        </Button>
                      )}
                      {i < currentTasks.length - 1 && (
                        <Button
                          kind="ghost"
                          onClick={() => moveTask(i, 1)}
                          title="Move down"
                          style={{ fontSize: calcPx(11), padding: `0 ${calcSf(6)}` }}
                        >
                          Move down
                        </Button>
                      )}
                      {i === currentTasks.length - 1 && (
                        <Button
                          kind="ghost"
                          onClick={() => deleteTask(t.id)}
                          ariaLabel="Delete"
                          style={{ fontSize: calcPx(11), padding: `0 ${calcSf(6)}` }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Today" mono={isToday ? undefined : 'Overview'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: calcSf(8) }}>
            <KpiRow>
              <Kpi value={todayTasks.filter((t) => t.done).length} label="Done today" accent={todayTasks.length > 0} />
              <Kpi value={todayTasks.length} label="All items today" />
              <Kpi value={streak.current} label="Day streak" />
            </KpiRow>
            {todayTasks.length === 0 ? (
              <Body sm>No tasks scheduled for today.</Body>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: calcSf(4) }}>
                {todayTasks.slice(0, 4).map((t) => (
                  <li key={t.id} style={{ display: 'flex', gap: calcSf(6), alignItems: 'center' }}>
                    <span
                      aria-hidden
                      style={{
                        width: calcSf(6),
                        height: calcSf(6),
                        borderRadius: '50%',
                        background: t.done ? 'var(--accent)' : 'var(--line)',
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: calcPx(12), color: t.done ? 'var(--ink-60)' : 'var(--ink)', textDecoration: t.done ? 'line-through' : 'none' }}>
                      {t.label}
                    </span>
                  </li>
                ))}
                {todayTasks.length > 4 && (
                  <li style={{ fontSize: calcPx(11), color: 'var(--ink-60)', marginTop: calcSf(2) }}>+{todayTasks.length - 4} more</li>
                )}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
