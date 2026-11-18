import { useEffect, useRef, useState } from 'react'
import { Body, Button, Card, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'
import { addHabit, deleteHabit, dayKey, isDone, listHabits, renameHabit, streak, toggleDay, type Habit } from './host'

const SP = 'calc(8px * var(--sf))'
const SP_SM = 'calc(4px * var(--sf))'
const RADIUS = 'calc(8px * var(--sf))'
const RADIUS_SM = 'calc(4px * var(--sf))'

interface DayCell {
  key: string
  label: string
}

function lastSeven(today: Date): DayCell[] {
  const out: DayCell[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    out.push({ key: dayKey(d), label: i === 0 ? 'Today' : i === 1 ? '1 day ago' : `${i} days ago` })
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
  const renameInputRef = useRef<HTMLInputElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

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
      setError('Enter a habit name.')
      return
    }
    if (habits.some((h) => h.name.toLowerCase() === n.toLowerCase())) {
      setError('That habit already exists.')
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

  function onConfirmDelete() {
    if (confirm) deleteHabit(confirm)
    setConfirm('')
    refresh()
  }

  const toDelete = habits.find((h) => h.id === confirm)
  const toRename = habits.find((h) => h.id === renaming)

  return (
    <main style={{ maxWidth: 'calc(720px * var(--sf))' }}>
      <Card title="Habit tracker">
        <Stack>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onAdd()
            }}
          >
            <div style={{ display: 'flex', gap: SP, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextInput label="Habit name" value={name} onChange={(v) => { setName(v); setError('') }} />
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
          <MonoLabel sm>Habits</MonoLabel>
          {habits.length === 0 ? (
            <Body sm>No habits yet. Add one above.</Body>
          ) : (
            <ul role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: SP }}>
              {habits.map((h) => (
                <li
                  key={h.id}
                  role="listitem"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SP,
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
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
                    <span style={{ fontWeight: 600 }}>{h.name}</span>
                    <span style={{ color: 'var(--ink-60)' }}>
                      Streak: {streak(h, today)}
                    </span>
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
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: SP_SM }}>
                    {days.map((d) => {
                      const done = isDone(h, d.key)
                      return (
                        <button
                          key={d.key}
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={`${h.name}, ${d.label}`}
                          onClick={() => {
                            toggleDay(h.id, d.key)
                            refresh()
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: SP_SM,
                            minWidth: 'calc(24px * var(--sf))',
                            height: 'calc(24px * var(--sf))',
                            padding: `${SP_SM} ${SP_SM}`,
                            border: done ? 'calc(1px * var(--sf)) solid var(--accent)' : 'calc(1px * var(--sf)) solid var(--ui-line2)',
                            borderRadius: RADIUS_SM,
                            background: done ? 'var(--accent)' : 'transparent',
                            color: done ? 'var(--on-accent)' : 'var(--ink)',
                            cursor: 'pointer',
                            fontSize: 'calc(12px * var(--tf))',
                            lineHeight: 1.2,
                          }}
                        >
                          {done && <span aria-hidden="true">✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </Card>
      {renaming && toRename && (
        <div
          onClick={onRenameCancel}
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
            aria-label={`Rename ${toRename.name}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: RADIUS,
              padding: 'calc(16px * var(--sf))',
              width: 'calc(320px * var(--sf))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <Title size="md">Rename habit</Title>
            <label className="lc-field" style={{ display: 'block', margin: 'calc(8px * var(--sf)) 0 0' }}>
              <span className="lc-field-label">New name for {toRename.name}</span>
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
            <div
              style={{
                display: 'flex',
                gap: SP,
                marginTop: 'calc(16px * var(--sf))',
                justifyContent: 'flex-end',
              }}
            >
              <button type="button" className="lc-btn" onClick={onRenameCancel}>
                Cancel
              </button>
              <button type="button" className="lc-btn lc-btn-primary" onClick={onRenameSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {confirm && toDelete && (
        <div
          onClick={() => setConfirm('')}
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
            aria-label={`Delete ${toDelete.name}?`}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--paper)',
              color: 'var(--ink)',
              border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
              borderRadius: RADIUS,
              padding: 'calc(16px * var(--sf))',
              width: 'calc(320px * var(--sf))',
              boxShadow: 'var(--shadow)',
            }}
          >
            <Title size="md">Delete {toDelete.name}?</Title>
            <Body sm style={{ marginTop: SP_SM }}>This removes the habit and its ticks.</Body>
            <div
              style={{
                display: 'flex',
                gap: SP,
                marginTop: 'calc(16px * var(--sf))',
                justifyContent: 'flex-end',
              }}
            >
              <button ref={cancelRef} type="button" className="lc-btn" onClick={() => setConfirm('')}>
                Cancel
              </button>
              <button type="button" className="lc-btn lc-btn-primary" onClick={onConfirmDelete}>
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
