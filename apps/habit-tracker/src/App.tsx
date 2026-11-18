import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, Stack, Title, TextInput } from '@lacuna/ui'
import { addHabit, deleteHabit, dayKey, isDone, listHabits, renameHabit, streak, toggleDay, type Habit } from './host'

const SP = 'calc(8px * var(--sf))'
const SP_SM = 'calc(4px * var(--sf))'
const RADIUS = 'calc(8px * var(--sf))'
const RADIUS_SM = 'calc(4px * var(--sf))'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DayCell {
  key: string
  label: string
  isToday: boolean
}

function lastSeven(today: Date): DayCell[] {
  const out: DayCell[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push({ key: dayKey(d), label: DAY_NAMES[d.getDay()], isToday: i === 0 })
  }
  return out
}

export function App() {
  const [habits, setHabits] = useState<Habit[]>(() => listHabits())
  const [today, setToday] = useState<Date>(() => new Date())
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setHabits(listHabits())
  }, [])

  useEffect(() => {
    if (confirm) cancelRef.current?.focus()
  }, [confirm])

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }
  }, [renaming])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirm) setConfirm('')
        else if (renaming) setRenaming('')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirm, renaming])

  const days = lastSeven(today)

  function refresh() {
    setToday(new Date())
    setHabits(listHabits())
  }

  function onAdd() {
    const n = name.trim()
    if (!n) {
      setError('Name is required')
      return
    }
    if (habits.some((h) => h.name.toLowerCase() === n.toLowerCase())) {
      setError('A habit with this name already exists')
      return
    }
    addHabit(n)
    setName('')
    setError('')
    refresh()
  }

  function onRenameCancel() {
    setRenaming('')
    setRenameValue('')
  }

  function onRenameSave() {
    const n = renameValue.trim()
    const target = habits.find((h) => h.id === renaming)
    if (target && n) renameHabit(target.id, n)
    onRenameCancel()
    refresh()
  }

  function onConfirmClose() {
    setConfirm('')
  }

  function onConfirmDelete() {
    if (confirm) deleteHabit(confirm)
    setConfirm('')
    refresh()
  }

  const toDelete = habits.find((h) => h.id === confirm)

  return (
    <main style={{ maxWidth: 'calc(720px * var(--sf))' }}>
      <Card mono="Habits" title="Habit tracker">
        <Stack>
          <Body sm>
            Tick the day you did a habit. The streak counts today if it is done, then runs back to the most recent
            missed day.
          </Body>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onAdd()
            }}
          >
            <div style={{ display: 'flex', gap: SP, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextInput label="New habit name" value={name} onChange={(v) => { setName(v); setError('') }} />
              <Button kind="primary" onClick={onAdd} style={{ flex: 'none' }}>
                Add habit
              </Button>
            </div>
            {error && (
              <p role="alert" style={{ margin: `${SP} 0 0`, color: 'var(--accent)' }}>
                {error}
              </p>
            )}
          </form>
          {habits.length === 0 && <Body sm>No habits yet. Add one above.</Body>}
          {habits.map((h) => (
            <section
              key={h.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: SP,
                border: 'calc(1px * var(--sf)) solid var(--line)',
                borderRadius: RADIUS,
                padding: SP,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: SP,
                }}
              >
                {renaming === h.id ? (
                  <label className="lc-field" style={{ flex: '1 1 100%' }}>
                    <span className="lc-field-label">Habit name</span>
                    <input
                      ref={renameInputRef}
                      className="lc-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          onRenameSave()
                        }
                      }}
                    />
                  </label>
                ) : (
                  <span
                    onDoubleClick={() => {
                      setRenaming(h.id)
                      setRenameValue(h.name)
                    }}
                    style={{ fontWeight: 600, cursor: 'text' }}
                    title="Double-click to rename"
                  >
                    {h.name}
                  </span>
                )}
                <span style={{ color: 'var(--faint)' }}>
                  Streak: {streak(h, today)}
                </span>
                {renaming !== h.id && (
                  <>
                    <span style={{ flex: 1 }} />
                    <Button
                      kind="ghost"
                      onClick={() => {
                        setRenaming(h.id)
                        setRenameValue(h.name)
                      }}
                    >
                      Rename {h.name}
                    </Button>
                    <Button kind="ghost" onClick={() => setConfirm(h.id)}>
                      Delete {h.name}
                    </Button>
                  </>
                )}
                {renaming === h.id && (
                  <span style={{ display: 'inline-flex', gap: SP, flexBasis: '100%' }}>
                    <Button kind="primary" onClick={onRenameSave}>
                      Save
                    </Button>
                    <Button onClick={onRenameCancel}>Cancel</Button>
                  </span>
                )}
                {days.map((d) => {
                  const done = isDone(h, d.key)
                  const label = d.isToday ? 'Today' : d.label
                  return (
                    <button
                      key={d.key}
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={`${label}${done ? ', done' : ', missed'}`}
                      onClick={() => {
                        toggleDay(h.id, d.key)
                        refresh()
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: SP_SM,
                        flex: '0 0 auto',
                        flexBasis: 'calc(120px * var(--sf))',
                        margin: `${SP_SM} ${SP_SM} 0 0`,
                        padding: `${SP_SM} ${SP}`,
                        border: done ? 'calc(1px * var(--sf)) solid var(--accent)' : 'calc(1px * var(--sf)) solid var(--line)',
                        borderRadius: RADIUS_SM,
                        background: done ? 'var(--accent)' : 'transparent',
                        color: done ? 'var(--on-accent)' : 'var(--ink)',
                        cursor: 'pointer',
                        fontSize: 'calc(12px * var(--tf))',
                        lineHeight: 1.2,
                      }}
                    >
                      <span aria-hidden="true">{done ? '✓' : '–'}</span>
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </Stack>
      </Card>
      {confirm && (
        <div
          onClick={onConfirmClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Delete habit"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: 'calc(1px * var(--sf)) solid var(--line)',
              borderRadius: RADIUS,
              padding: 'calc(16px * var(--sf))',
              width: 'calc(320px * var(--sf))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <Title size="md">Delete habit</Title>
            <Body sm>Remove “{toDelete?.name}” and its history?</Body>
            <div
              style={{
                display: 'flex',
                gap: SP,
                marginTop: 'calc(16px * var(--sf))',
                justifyContent: 'flex-end',
              }}
            >
              <button ref={cancelRef} type="button" className="lc-btn" onClick={onConfirmClose}>
                Cancel
              </button>
              <button type="button" className="lc-btn lc-btn-primary" onClick={onConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
