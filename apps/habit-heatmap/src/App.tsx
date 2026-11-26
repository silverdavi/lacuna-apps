import { useEffect, useMemo, useState } from 'react'
import { AppShell, Body, Button, Card, EmptyState, MonoLabel, Rail, Stack } from '@lacuna/ui'
import { host } from './host/mock'
import type { HabitState } from './host/index'
import {
  addHabit,
  addDays,
  computeStreaks,
  countMap,
  heatLevel,
  removeHabit,
  toKey,
  toggleCompletion,
  yearCells,
  yearMonthLabels,
} from './engine'

function heatStyle(count: number): { background: string; filled: boolean } {
  switch (heatLevel(count)) {
    case 'empty':
      return { background: 'var(--ui-bright)', filled: false }
    case 'low':
      return { background: 'color-mix(in srgb, var(--geo-verm) 45%, var(--ui-card))', filled: true }
    case 'mid':
      return { background: 'color-mix(in srgb, var(--geo-verm) 70%, var(--ui-card))', filled: true }
    case 'high':
      return { background: 'var(--geo-verm)', filled: true }
  }
}

type Tab = 'Habits' | 'Heatmap'

export function App() {
  const [state, setState] = useState<HabitState>(() => host.read())
  const [tab, setTab] = useState<Tab>('Habits')
  const [newName, setNewName] = useState('')
  const [newError, setNewError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [])
  const today = toKey(now)
  const yesterday = toKey(addDays(now, -1))
  const year = now.getFullYear()

  useEffect(() => {
    host.write(state)
  }, [state])

  const counts = useMemo(() => countMap(state.completions), [state.completions])
  const streaks = useMemo(() => computeStreaks(state.completions, today), [state.completions, today])
  const cells = useMemo(() => yearCells(year, counts), [year, counts])
  const monthLabels = useMemo(() => yearMonthLabels(year), [year])

  function addHabitNow() {
    const name = newName.trim()
    if (!name) {
      setNewError('Name the habit')
      return
    }
    setNewError(null)
    setNewName('')
    setState((s) => addHabit(s, name))
  }

  function remove(id: string, name: string) {
    setState((s) => removeHabit(s, id))
  }

  const dayLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <AppShell
      name="Habit Heatmap"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={state.habits.length ? `${state.habits.length} ITEM${state.habits.length === 1 ? '' : 'S'}` : 'EMPTY'}
      status={state.habits.length ? `${state.completions.length} logged day${state.completions.length === 1 ? '' : 's'} · best ${streaks.longest}` : 'Add a habit to begin'}
      side={
        <Rail
          title="Heatmap tour"
          note={`${year} · 53 weeks`}
          chips={[
            `HABITS ${state.habits.length}`,
            `LOGGED ${state.completions.length}`,
            `BEST ${streaks.longest}`,
          ]}
        />
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Habit Heatmap views">
        {(['Habits', 'Heatmap'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="lc-tab"
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
              border: 'none',
              background: 'none',
              borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              cursor: 'pointer',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Habits' && (
        <div role="tabpanel" aria-label="Habits">
          <Card title="Habit Heatmap" mono="HABITS" accent>
            <Stack lg>
              <div>
                <Body>Log a habit for today or yesterday, and watch your streak grow.</Body>
              </div>

              {state.habits.length === 0 ? (
                <EmptyState
                  title="No habits yet"
                  detail="Add a habit to start tracking."
                  actionLabel="Add your first habit"
                  onAction={addHabitNow}
                />
              ) : (
                <div>
                  <MonoLabel sm style={{ color: 'var(--ink-60)' }}>HABITS</MonoLabel>
                  <ul style={{ listStyle: 'none', margin: 'calc(8px * var(--sf)) 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 'calc(6px * var(--sf))' }}>
                    {state.habits.map((h) => {
                      const { current } = streaks
                      return (
                        <li
                          key={h.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 'calc(10px * var(--sf))',
                            padding: 'calc(10px * var(--sf))',
                            border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                            borderRadius: 'calc(4px * var(--sf))',
                            background: 'var(--ui-bright)',
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))' }}>
                            <span style={{ font: '400 calc(14px * var(--tf)) var(--sans)', color: 'var(--ink)' }}>{h.name}</span>
                            <span style={{ font: '500 calc(12px * var(--tf)) var(--mono)', color: 'var(--accent)' }}>Streak: {current}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
                            <Button onClick={() => setState((s) => toggleCompletion(s, today))} aria-pressed={state.completions.includes(today)}>
                              Log today
                            </Button>
                            <Button onClick={() => setState((s) => toggleCompletion(s, yesterday))} aria-pressed={state.completions.includes(yesterday)}>
                              Log yesterday
                            </Button>
                            <Button ariaLabel={`Delete ${h.name}`} onClick={() => remove(h.id, h.name)}>
                              Delete {h.name}
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div>
                <MonoLabel sm style={{ color: 'var(--ink-60)' }}>ADD HABIT</MonoLabel>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(8px * var(--sf))', flexWrap: 'wrap', alignItems: 'center' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 'calc(4px * var(--sf))', flex: '1 1 calc(220px * var(--sf))' }}>
                    <span style={{ font: '500 calc(12px * var(--tf)) var(--mono)', color: 'var(--ink-60)', textTransform: 'uppercase', letterSpacing: 'calc(0.08em * var(--sf))' }}>
                      Habit name
                    </span>
                    <input
                      id="habit-name"
                      type="text"
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value)
                        if (newError) setNewError(null)
                      }}
                      placeholder="e.g. Stretch for 10 minutes"
                      style={{
                        padding: 'calc(8px * var(--sf))',
                        border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                        borderRadius: 'calc(4px * var(--sf))',
                        background: 'var(--ui-bright)',
                        color: 'var(--ink)',
                        font: '400 calc(14px * var(--tf)) var(--sans)',
                      }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button kind="primary" onClick={addHabitNow}>Add habit</Button>
                  </div>
                </div>
                {newError && <Body sm style={{ marginTop: 'calc(4px * var(--sf))', color: 'var(--danger)' }}>{newError}</Body>}
              </div>
            </Stack>
          </Card>
        </div>
      )}

      {tab === 'Heatmap' && (
        <div role="tabpanel" aria-label="Heatmap">
          <Card title="Heatmap" mono="ACTIVITY" accent>
            <Stack lg>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'calc(12px * var(--sf))' }}>
                  <MonoLabel sm style={{ color: 'var(--ink-60)' }}>{year} ACTIVITY</MonoLabel>
                  <MonoLabel sm style={{ color: 'var(--ink-60)' }}>53 weeks</MonoLabel>
                </div>
                <div style={{ position: 'relative', marginTop: 'calc(8px * var(--sf))' }}>
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'relative',
                      height: 'calc(14px * var(--tf))',
                      maxWidth: 'calc(560px * var(--sf))',
                      marginBottom: 'calc(3px * var(--sf))',
                    }}
                  >
                    {monthLabels.map((m) => (
                      <span
                        key={m.index + m.label}
                        style={{
                          position: 'absolute',
                          left: `calc(${(m.index / 365) * 100}%)`,
                          transform: 'translateX(-50%)',
                          font: '500 calc(10px * var(--tf)) var(--mono)',
                          color: 'var(--ink-60)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                  <div
                    role="grid"
                    aria-label={`${year} activity heatmap, 53 weeks`}
                    style={{
                      display: 'grid',
                      gridTemplateRows: 'repeat(7, auto)',
                      gridAutoFlow: 'column',
                      gridAutoColumns: 'minmax(0, 1fr)',
                      gap: 'calc(2px * var(--sf))',
                      maxWidth: 'calc(560px * var(--sf))',
                    }}
                  >
                    {cells.map((c) => {
                      const { background, filled } = heatStyle(c.count)
                      return (
                        <button
                          key={c.key}
                          type="button"
                          role="gridcell"
                          tabIndex={-1}
                          data-day={c.key}
                          data-value={c.count > 0 ? '1' : '0'}
                          aria-label={`${dayLabel(c.date)}, ${c.count} completion${c.count === 1 ? '' : 's'}`}
                          aria-pressed={filled}
                          onClick={() => setState((s) => toggleCompletion(s, c.key))}
                          style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            padding: 0,
                            border: 'none',
                            borderRadius: 'calc(2px * var(--sf))',
                            cursor: 'pointer',
                            background,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
                <Body sm style={{ marginTop: 'calc(10px * var(--sf))', color: 'var(--mid)' }}>
                  Each square is a day of {year}, Monday to Sunday, across 53 weeks. Click a day to toggle it.
                </Body>
              </div>
            </Stack>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
