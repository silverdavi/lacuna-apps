import { useEffect, useRef, useState } from 'react'
import { AppShell, Body, Button, Card, EmptyState, MonoLabel, Stack, TextInput, Title } from '@lacuna/ui'
import { addHabit, deleteHabit, listHabits, renameHabit, toggleDay } from './host'
import { isDone, lastSeven, streak, toggleDone, validateName, type Habit } from './engine'

const SP = 'calc(8px * var(--sf))'
const SP_SM = 'calc(4px * var(--sf))'
const RADIUS = 'calc(8px * var(--sf))'
const RADIUS_SM = 'calc(4px * var(--sf))'

export function App() {
  const [habits, setHabits] = useState<Habit[]>(() => listHabits())
  const [today, setToday] = useState<Date>(() => new Date())
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [renaming, setRenaming] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

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
    const problem = validateName(name, habits)
    if (problem) {
      setError(problem)
      return
    }
    addHabit(name.trim())
    setName('')
    setError('')
    refresh()
  }

  function onRenameCancel() {
    setRenaming('')
    setRenameValue('')
  }

  function onRenameSave() {
    const target = habits.find((h) => h.id === renaming)
    if (target && renameValue.trim()) renameHabit(target.id, renameValue.trim())
    onRenameCancel()
    refresh()
  }

  function onConfirmDelete() {
    if (confirm) deleteHabit(confirm)
    setConfirm('')
    refresh()
  }

  function onToggleDay(h: Habit, day: string) {
    setHabits(toggleDone(habits, h.id, day))
    toggleDay(h.id, day)
  }

  const toDelete = habits.find((h) => h.id === confirm)
  const toRename = habits.find((h) => h.id === renaming)

  return (
    <AppShell name="Habit Tracker" icon="calendar" hue="teal" category="Apps">
      <Card title="Habit tracker">
        <Stack>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onAdd()
            }}
          >
            <div style={{ display: 'flex', gap: SP, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <TextInput label="Habit name" value={name} onChange={(v) => { setName(v); setError('') }} error={error || null} />
              <Button kind="primary" onClick={onAdd} style={{ flex: 'none' }}>
                Add habit
              </Button>
            </div>
          </form>
          <MonoLabel sm>Habits</MonoLabel>
          {habits.length === 0 ? (
            <EmptyState title="No habits yet" detail="Add one above." />
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
                          onClick={() => onToggleDay(h, d.key)}
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
            background: 'color-mix(in srgb, var(--ink) 40%, transparent)',
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
              <Button kind="secondary" onClick={onRenameCancel}>Cancel</Button>
              <Button kind="primary" onClick={onRenameSave}>Save</Button>
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
            background: 'color-mix(in srgb, var(--ink) 40%, transparent)',
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
              <Button kind="secondary" onClick={() => setConfirm('')}>
                Cancel
              </Button>
              <Button kind="primary" onClick={onConfirmDelete}>
                Confirm delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
