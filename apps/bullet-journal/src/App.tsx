import { useEffect, useState } from 'react'
import { AppShell, Button, Card, EmptyState, PrimaryButton, Tag, TextInput } from '@lacuna/ui'
import { toISODate } from '@lacuna/date-math'
import { setTasksForDay, tasksForDay, type DayTask } from './host'

interface ItemTask extends DayTask {
  id: string
}

function todayISO(): string {
  return toISODate(new Date())
}

function taskId(label: string, index: number): string {
  const seen: string[] = []
  for (const w of label.split(/\s+/)) if (w !== '' && !seen.includes(w)) seen.push(w)
  return seen.join('-') + ':' + index
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function App() {
  const now = new Date()
  const [month, setMonth] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string>(todayISO())
  const [draft, setDraft] = useState('')
  const [tasks, setTasks] = useState<ItemTask[]>(() =>
    tasksForDay(selected).map((t, i) => ({ ...t, id: taskId(t.label, i) })),
  )

  useEffect(() => {
    setTasks(tasksForDay(selected).map((t, i) => ({ ...t, id: taskId(t.label, i) })))
  }, [selected])

  function persist(next: ItemTask[]) {
    setTasks(next)
    setTasksForDay(selected, next.map(({ label, done }) => ({ label, done })))
  }

  function selectDay(day: number) {
    setSelected(toISODate(new Date(month.y, month.m, day)))
  }

  function shiftMonth(delta: number) {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function commitAdd() {
    const label = draft.trim()
    if (label === '') return
    persist([...tasks, { id: taskId(label, tasks.length), label, done: false }])
    setDraft('')
  }

  function toggle(id: string) {
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  function move(id: string, dir: -1 | 1) {
    const i = tasks.findIndex((t) => t.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= tasks.length) return
    const next = [...tasks]
    ;[next[i], next[j]] = [next[j], next[i]]
    persist(next)
  }

  function removeTask(id: string) {
    const remaining = tasks.filter((t) => t.id !== id)
    if (remaining.length === 1 && !remaining[0].done) {
      remaining[0] = { ...remaining[0], done: true }
    }
    persist(remaining)
  }

  const done = tasks.filter((t) => t.done).length
  const dim = new Date(month.y, month.m + 1, 0).getDate()
  const firstWeekday = new Date(month.y, month.m, 1).getDay()
  const cells: Array<number | null> = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const today = todayISO()

  return (
    <AppShell name="Bullet Journal" hue="gold" category="Productivity">
      <Card
        title={MONTHS[month.m] + ' ' + month.y}
        mono="Month"
        actions={
          <>
            <Button kind="ghost" onClick={() => shiftMonth(-1)} ariaLabel="Previous month">
              &larr;
            </Button>
            <Button kind="ghost" onClick={() => shiftMonth(1)} ariaLabel="Next month">
              &rarr;
            </Button>
          </>
        }
      >
        <div
          role="group"
          aria-label={MONTHS[month.m] + ' ' + month.y}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(4px * var(--sf))' }}
        >
          {WEEKDAYS.map((w, i) => (
            <span
              key={i}
              aria-hidden="true"
              style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)', textAlign: 'center' }}
            >
              {w}
            </span>
          ))}
          {cells.map((day, i) =>
            day === null ? (
              <span key={'e' + i} aria-hidden="true" />
            ) : (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                aria-label={String(day)}
                aria-pressed={selected === toISODate(new Date(month.y, month.m, day))}
                style={{
                  minHeight: 'calc(32px * var(--sf))',
                  border: 'calc(1px * var(--sf)) solid ' + (selected === toISODate(new Date(month.y, month.m, day)) ? 'var(--accent)' : 'var(--ui-line2)'),
                  borderRadius: 'calc(2px * var(--sf))',
                  background: selected === toISODate(new Date(month.y, month.m, day)) ? 'var(--accent-soft)' : 'var(--paper)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--sans)',
                  fontSize: 'calc(14px * var(--tf))',
                  cursor: 'pointer',
                }}
              >
                {day}
              </button>
            ),
          )}
        </div>
      </Card>

      <Card title={'Tasks for ' + selected.split('-').slice(2).join('')} mono="Day">
        <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'center', marginBottom: 'calc(8px * var(--sf))' }}>
          <span
            aria-label={`${done}/${tasks.length}`}
            style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)', whiteSpace: 'nowrap' }}
          >
            {done}/{tasks.length}
          </span>
          <Tag>{today === selected ? 'today' : 'day'}</Tag>
        </div>
        {tasks.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No tasks yet"
            detail="Add a task for this day below."
            actionLabel="Add a task"
          />
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' }}>
            {tasks.map((t, i) => (
              <li
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'calc(8px * var(--sf))',
                  padding: 'calc(8px * var(--sf))',
                  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                }}
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  aria-label={t.label}
                  onChange={() => toggle(t.id)}
                  style={{ margin: 0 }}
                />
                <span
                  style={{
                    flex: 1,
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(14px * var(--tf))',
                    color: 'var(--ink)',
                    textDecoration: t.done ? 'line-through' : 'none',
                  }}
                >
                  {t.label}
                </span>
                {i === tasks.length - 1 ? (
                  <>
                    <Button
                      kind="ghost"
                      onClick={() => move(t.id, -1)}
                      disabled={i === 0}
                      ariaLabel="Move up"
                    >
                      &uarr;
                    </Button>
                    <Button kind="ghost" onClick={() => removeTask(t.id)} ariaLabel="Delete">
                      &times;
                    </Button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div style={{ marginTop: 'calc(8px * var(--sf))', display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }} onKeyDown={(e) => { if (e.key === 'Enter') commitAdd() }}>
            <TextInput label="New task" value={draft} onChange={setDraft} placeholder="Add a task" />
          </div>
          <PrimaryButton onClick={commitAdd}>Add</PrimaryButton>
        </div>
      </Card>
    </AppShell>
  )
}
